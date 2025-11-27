import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

export const config = {
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  },
  pricing: {
    region: 'us-east-1' // Pricing API is only available in us-east-1
  },
  cache: {
    ttl: 3600 // 1 hour in seconds
  }
};

export const pricing = new AWS.Pricing({
  region: config.pricing.region
});

export const ec2 = new AWS.EC2();
export const rds = new AWS.RDS();