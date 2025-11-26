import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],

    services: {
        auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3002',
        terraformCost: process.env.TERRAFORM_COST_SERVICE_URL || 'http://terraform-cost-engine:8000',
        awsPricing: process.env.AWS_PRICING_SERVICE_URL || 'http://aws-pricing-service:3003',
        reports: process.env.REPORTS_SERVICE_URL || 'http://reports-service:3004'
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },

    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};