import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
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
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [...config.allowedFileTypes, '.zip'];
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize
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

    // Check if uploaded file is a zip
    const zipFile = req.files.find(f => f.originalname.endsWith('.zip'));
    
    if (zipFile) {
      await extractZip(zipFile.path, req.uploadPath);
      await fs.unlink(zipFile.path); // Remove zip after extraction
    }

    // Validate that we have at least one .tf file
    const hasTerraformFiles = await checkForTerraformFiles(req.uploadPath);
    
    if (!hasTerraformFiles) {
      return res.status(400).json({
        success: false,
        error: 'No Terraform files (.tf) found in upload'
      });
    }

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

async function extractZip(zipPath, destPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destPath }))
      .on('close', resolve)
      .on('error', reject);
  });
}

async function checkForTerraformFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.tf')) {
      return true;
    }
    if (entry.isDirectory()) {
      const subPath = path.join(dirPath, entry.name);
      const hasFiles = await checkForTerraformFiles(subPath);
      if (hasFiles) return true;
    }
  }
  
  return false;
}