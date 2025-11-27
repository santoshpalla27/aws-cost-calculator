import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/aws';
import { logger } from './utils/logger';
import { ec2Routes } from './controllers/ec2Controller';
import { rdsRoutes } from './controllers/rdsController';
import { s3Routes } from './controllers/s3Controller';
import { eksRoutes } from './controllers/eksController';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/ec2', ec2Routes);
app.use('/rds', rdsRoutes);
app.use('/s3', s3Routes);
app.use('/eks', eksRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'aws-pricing-service',
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  logger.info(`AWS Pricing service running on port ${PORT}`);
});

export default app;