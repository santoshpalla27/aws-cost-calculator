import { PricingClient } from '@aws-sdk/client-pricing';
import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { S3Client } from '@aws-sdk/client-s3';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';

export class AWSClientFactory {
  constructor(credentials) {
    if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required');
    }
    
    this.credentials = {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      ...(credentials.sessionToken && { sessionToken: credentials.sessionToken })
    };
  }

  createPricingClient() {
    return new PricingClient({
      region: 'us-east-1', // Pricing API only available in us-east-1
      credentials: this.credentials
    });
  }

  createEC2Client(region = 'us-east-1') {
    return new EC2Client({
      region,
      credentials: this.credentials
    });
  }

  createRDSClient(region = 'us-east-1') {
    return new RDSClient({
      region,
      credentials: this.credentials
    });
  }

  createS3Client(region = 'us-east-1') {
    return new S3Client({
      region,
      credentials: this.credentials
    });
  }

  createCostExplorerClient() {
    return new CostExplorerClient({
      region: 'us-east-1',
      credentials: this.credentials
    });
  }
}