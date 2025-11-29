import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import unzipper from 'unzipper';
import { config } from '../config/app.config.js';
import logger from '../config/logger.config.js';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      if (!req.uploadPath) {
        const uploadId = uuidv4();
        const uploadPath = path.join(config.uploadDir, uploadId);
        await fs.mkdir(uploadPath, { recursive: true });
        req.uploadPath = uploadPath;
      }
      cb(null, req.uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const relativePath = file.originalname;
    cb(null, relativePath);
  }
});

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

    logger.info('Processing ' + req.files.length + ' uploaded files');
    logger.info('Upload path: ' + req.uploadPath);

    const zipFile = req.files.find(f => f.originalname.toLowerCase().endsWith('.zip'));

    if (zipFile) {
      logger.info('Found zip file: ' + zipFile.originalname);
      await extractZip(zipFile.path, req.uploadPath);
      await fs.unlink(zipFile.path);
      logger.info('Zip file extracted and removed');
    } else {
      await preserveDirectoryStructure(req.files, req.uploadPath);
    }

    const contents = await fs.readdir(req.uploadPath);
    logger.info('Directory contents after extraction: ' + JSON.stringify(contents));

    const hasTerraformFiles = await checkForTerraformFiles(req.uploadPath);

    if (!hasTerraformFiles) {
      const allFiles = await getAllFiles(req.uploadPath);
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

async function preserveDirectoryStructure(files, uploadPath) {
  logger.info('Preserving directory structure for ' + files.length + ' files');
  
  for (const file of files) {
    const relativePath = file.originalname;
    const targetPath = path.join(uploadPath, relativePath);
    const targetDir = path.dirname(targetPath);
    
    await fs.mkdir(targetDir, { recursive: true });
    
    try {
      await fs.rename(file.path, targetPath);
      logger.info('Moved file to: ' + relativePath);
    } catch (error) {
      logger.warn('Could not move file ' + file.originalname + ': ' + error.message);
    }
  }
}

async function extractZip(zipPath, destPath) {
  logger.info('Extracting zip: ' + zipPath + ' to ' + destPath);

  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const fileName = entry.path;
        const type = entry.type;

        if (fileName.includes('__MACOSX') || fileName.startsWith('.')) {
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
  logger.info('Checking for Terraform files in: ' + dirPath);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        logger.info('Found file: ' + entry.name);
        if (entry.name.endsWith('.tf') || entry.name.endsWith('.tfvars')) {
          logger.info('Found Terraform file: ' + entry.name);
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