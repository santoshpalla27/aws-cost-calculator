import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/app.config.js';
import { EstimationController } from './controllers/estimation.controller.js';
import { upload, processUpload } from './middleware/upload.middleware.js';
import { validateEstimationRequest } from './middleware/validator.js';
import { errorHandler, notFoundHandler } from './middleware/error.handler.js';
import logger from './config/logger.config.js';
import fs from 'fs/promises';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
await fs.mkdir(config.uploadDir, { recursive: true });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize controller
const estimationController = new EstimationController();

// Routes
app.post(
  '/api/estimate',
  upload.array('files'),
  processUpload,
  validateEstimationRequest,
  (req, res) => estimationController.estimateCost(req, res)
);

app.post(
  '/api/validate',
  upload.array('files'),
  processUpload,
  (req, res) => estimationController.validateTerraform(req, res)
);

app.get(
  '/api/metadata',
  (req, res) => estimationController.getResourceMetadata(req, res)
);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

export default app;