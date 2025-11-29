import { pricingRegistry } from './pricing.registry.js';
import { AWSClientFactory } from '../../config/aws.config.js';

// Compute Services
import { EC2PricingService } from './providers/compute/ec2.pricing.js';
import { LambdaPricingService } from './providers/compute/lambda.pricing.js';
import { ECSPricingService } from './providers/compute/ecs.pricing.js';
import { EKSPricingService } from './providers/compute/eks.pricing.js';

// Networking Services
import { VPCPricingService } from './providers/networking/vpc.pricing.js';
import { ALBPricingService } from './providers/networking/alb.pricing.js';
import { CloudFrontPricingService } from './providers/networking/cloudfront.pricing.js';
import { Route53PricingService } from './providers/networking/route53.pricing.js';
import { APIGatewayPricingService } from './providers/networking/api-gateway.pricing.js';

// Storage Services
import { S3PricingService } from './providers/storage/s3.pricing.js';
import { EFSPricingService } from './providers/storage/efs.pricing.js';

// Database Services
import { RDSPricingService } from './providers/database/rds.pricing.js';
import { DynamoDBPricingService } from './providers/database/dynamodb.pricing.js';
import { ElastiCachePricingService } from './providers/database/elasticache.pricing.js';

// Messaging Services
import { SQSPricingService } from './providers/messaging/sqs.pricing.js';
import { SNSPricingService } from './providers/messaging/sns.pricing.js';
import { EventBridgePricingService } from './providers/messaging/eventbridge.pricing.js';
import { MSKPricingService } from './providers/messaging/msk.pricing.js';

// Security Services
import { WAFPricingService } from './providers/security/waf.pricing.js';
import { ShieldPricingService } from './providers/security/shield.pricing.js';
import { KMSPricingService } from './providers/security/kms.pricing.js';
import { SecretsManagerPricingService } from './providers/security/secrets-manager.pricing.js';
import { SSMPricingService } from './providers/security/ssm.pricing.js';

// Monitoring Services
import { CloudWatchPricingService } from './providers/monitoring/cloudwatch.pricing.js';
import { CloudTrailPricingService } from './providers/monitoring/cloudtrail.pricing.js';
import { XRayPricingService } from './providers/monitoring/xray.pricing.js';

// DevOps Services
import { CodePipelinePricingService } from './providers/devops/codepipeline.pricing.js';
import { CodeBuildPricingService } from './providers/devops/codebuild.pricing.js';
import { StepFunctionsPricingService } from './providers/devops/step-functions.pricing.js';

import logger from '../../config/logger.config.js';

/**
 * Initialize all pricing services and register them
 */
export function initializePricingServices(awsClientFactory) {
  const pricingClient = awsClientFactory.createPricingClient();

  // Compute
  pricingRegistry.register(new EC2PricingService(pricingClient));
  pricingRegistry.register(new LambdaPricingService(pricingClient));
  pricingRegistry.register(new ECSPricingService(pricingClient));
  pricingRegistry.register(new EKSPricingService(pricingClient));

  // Networking
  pricingRegistry.register(new VPCPricingService(pricingClient));
  pricingRegistry.register(new ALBPricingService(pricingClient));
  pricingRegistry.register(new CloudFrontPricingService(pricingClient));
  pricingRegistry.register(new Route53PricingService(pricingClient));
  pricingRegistry.register(new APIGatewayPricingService(pricingClient));

  // Storage
  pricingRegistry.register(new S3PricingService(pricingClient));
  pricingRegistry.register(new EFSPricingService(pricingClient));

  // Database
  pricingRegistry.register(new RDSPricingService(pricingClient));
  pricingRegistry.register(new DynamoDBPricingService(pricingClient));
  pricingRegistry.register(new ElastiCachePricingService(pricingClient));

  // Messaging
  pricingRegistry.register(new SQSPricingService(pricingClient));
  pricingRegistry.register(new SNSPricingService(pricingClient));
  pricingRegistry.register(new EventBridgePricingService(pricingClient));
  pricingRegistry.register(new MSKPricingService(pricingClient));

  // Security
  pricingRegistry.register(new WAFPricingService(pricingClient));
  pricingRegistry.register(new ShieldPricingService(pricingClient));
  pricingRegistry.register(new KMSPricingService(pricingClient));
  pricingRegistry.register(new SecretsManagerPricingService(pricingClient));
  pricingRegistry.register(new SSMPricingService(pricingClient));

  // Monitoring
  pricingRegistry.register(new CloudWatchPricingService(pricingClient));
  pricingRegistry.register(new CloudTrailPricingService(pricingClient));
  pricingRegistry.register(new XRayPricingService(pricingClient));

  // DevOps
  pricingRegistry.register(new CodePipelinePricingService(pricingClient));
  pricingRegistry.register(new CodeBuildPricingService(pricingClient));
  pricingRegistry.register(new StepFunctionsPricingService(pricingClient));

  logger.info(`Initialized ${pricingRegistry.getAllProviders().length} pricing providers`);
  logger.info(`Supporting ${pricingRegistry.getSupportedResourceTypes().length} resource types`);

  return pricingRegistry;
}

export { pricingRegistry };