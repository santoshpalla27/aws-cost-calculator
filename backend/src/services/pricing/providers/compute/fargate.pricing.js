import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class FargatePricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'Fargate');
  }

  getServiceCode() {
    return 'AmazonECS';
  }

  getSupportedResourceTypes() {
    return [
      'aws_ecs_task_definition' // When used with Fargate
    ];
  }

  async calculateCost(resource, region) {
    // Fargate costs are calculated in ECS service
    // This is for standalone task definitions if needed
    return null;
  }
}