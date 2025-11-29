import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class SecretsManagerPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'SecretsManager');
  }

  getServiceCode() {
    return 'AWSSecretsManager';
  }

  getSupportedResourceTypes() {
    return [
      'aws_secretsmanager_secret',
      'aws_secretsmanager_secret_version',
      'aws_secretsmanager_secret_rotation'
    ];
  }

  async calculateCost(resource, region) {
    if (resource.type !== 'aws_secretsmanager_secret') {
      return null;
    }

    const config = resource.config;
    
    // Secret storage: $0.40 per secret per month
    const storageCost = 0.40;
    
    // API calls: $0.05 per 10,000 API calls
    const estimatedAPICallsThousands = config._estimated_api_calls_thousands || 10;
    const apiCost = (estimatedAPICallsThousands / 10) * 0.05;
    
    const monthlyCost = storageCost + apiCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: this.monthlyToHourly(storageCost),
      apiCalls: this.monthlyToHourly(apiCost)
    }, {
      estimatedAPICallsThousands,
      rotationEnabled: !!config.rotation_lambda_arn || !!config.rotation_rules
    });
  }
}