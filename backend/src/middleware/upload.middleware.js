import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import { config } from '../config/app.config.js';
import logger from '../config/logger.config.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [...config.allowedFileTypes, '.zip'];
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type ' + ext + ' is not allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: 1000
  }
});

export const processUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadId = uuidv4();
    const uploadPath = path.join(config.uploadDir, uploadId);
    await fs.mkdir(uploadPath, { recursive: true });
    req.uploadPath = uploadPath;

    logger.info('Processing ' + req.files.length + ' uploaded files');
    logger.info('Upload path: ' + uploadPath);

    const zipFile = req.files.find(f => f.originalname.toLowerCase().endsWith('.zip'));

    if (zipFile) {
      logger.info('Processing zip file: ' + zipFile.originalname);
      const zipPath = path.join(uploadPath, zipFile.originalname);
      await fs.writeFile(zipPath, zipFile.buffer);
      await extractZip(zipPath, uploadPath);
      await fs.unlink(zipPath);
      logger.info('Zip file extracted and removed');
    } else {
      for (const file of req.files) {
        const relativePath = file.originalname;
        const filePath = path.join(uploadPath, relativePath);
        const fileDir = path.dirname(filePath);
        
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.buffer);
        
        logger.info('Saved file: ' + relativePath);
      }
    }

    const structure = await listDirectoryStructure(uploadPath);
    logger.info('Final directory structure: ' + JSON.stringify(structure, null, 2));

    const hasTerraformFiles = await checkForTerraformFiles(uploadPath);

    if (!hasTerraformFiles) {
      const allFiles = await getAllFiles(uploadPath);
      logger.error('No .tf files found. All files: ' + JSON.stringify(allFiles));

      return res.status(400).json({
        success: false,
        error: 'No Terraform files (.tf) found in upload',
        details: 'Found ' + allFiles.length + ' files but none were .tf files'
      });
    }

    logger.info('Terraform files found, proceeding to next middleware');
    next();
  } catch (error) {
    logger.error('Error processing upload:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing uploaded files',
      details: error.message
    });
  }
};

async function listDirectoryStructure(dirPath, prefix = '', depth = 0) {
  if (depth > 10) return {};
  
  const structure = {};
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        structure[entry.name] = await listDirectoryStructure(fullPath, prefix + entry.name + '/', depth + 1);
      } else {
        structure[entry.name] = {
          type: 'file',
          size: (await fs.stat(fullPath)).size
        };
      }
    }
  } catch (error) {
    logger.error('Error listing directory ' + dirPath + ':', error);
  }
  
  return structure;
}

async function extractZip(zipPath, destPath) {
  logger.info('Extracting zip: ' + zipPath + ' to ' + destPath);

  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const fileName = entry.path;
        const type = entry.type;

        if (fileName.includes('__MACOSX') || fileName.startsWith('.') || fileName.startsWith('._')) {
          entry.autodrain();
          return;
        }

        const fullPath = path.join(destPath, fileName);

        if (type === 'Directory') {
          await fs.mkdir(fullPath, { recursive: true });
          entry.autodrain();
        } else {
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          entry.pipe(createWriteStream(fullPath));
        }
      })
      .on('close', () => {
        logger.info('Zip extraction completed');
        resolve();
      })
      .on('error', (error) => {
        logger.error('Zip extraction error:', error);
        reject(error);
      });
  });
}

async function checkForTerraformFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        if (entry.name.endsWith('.tf') || entry.name.endsWith('.tfvars')) {
          logger.info('Found Terraform file: ' + fullPath);
          return true;
        }
      } else if (entry.isDirectory()) {
        const hasFiles = await checkForTerraformFiles(fullPath);
        if (hasFiles) return true;
      }
    }
  } catch (error) {
    logger.error('Error checking directory ' + dirPath + ':', error);
  }

  return false;
}

async function getAllFiles(dirPath, fileList = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }

  return fileList;
}