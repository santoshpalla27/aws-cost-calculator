import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['.tf', '.tfvars', '.json'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  },
  aws: {
    defaultRegion: process.env.AWS_DEFAULT_REGION || 'us-east-1',
    pricingRegion: 'us-east-1' // Pricing API only available in us-east-1
  }
};