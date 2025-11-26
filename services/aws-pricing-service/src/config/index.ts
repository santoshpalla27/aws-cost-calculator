import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3003,
    nodeEnv: process.env.NODE_ENV || 'development',

    redis: {
        url: process.env.REDIS_URL || 'redis://redis:6379',
        ttl: 3600 // 1 hour cache
    },

    aws: {
        region: process.env.AWS_DEFAULT_REGION || 'us-east-1'
    }
};