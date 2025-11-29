import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class SSMPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'SSM');
  }

  getServiceCode() {
    return 'AmazonSSM';
  }

  getSupportedResourceTypes() {
    return [
      'aws_ssm_parameter',
      'aws_ssm_document',
      'aws_ssm_association',
      'aws_ssm_maintenance_window',
      'aws_ssm_patch_baseline',
      'aws_ssm_activation'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_ssm_parameter':
        return this.calculateParameterCost(resource, region);
      default:
        return null;
    }
  }

  async calculateParameterCost(resource, region) {
    const config = resource.config;
    const tier = config.tier || 'Standard';
    
    if (tier === 'Standard') {
      // Standard parameters: free (up to 10,000)
      return this.formatCostResponse(0, {}, {
        tier: 'Standard',
        note: 'Standard parameters are free (up to 10,000 per account)'
      });
    }
    
    if (tier === 'Advanced') {
      // Advanced parameters: $0.05 per parameter per month
      const storageCost = 0.05;
      
      // API interactions: $0.05 per 10,000 API interactions
      const estimatedInteractionsThousands = config._estimated_interactions_thousands || 10;
      const apiCost = (estimatedInteractionsThousands / 10) * 0.05;
      
      const monthlyCost = storageCost + apiCost;
      const hourly = this.monthlyToHourly(monthlyCost);

      return this.formatCostResponse(hourly, {
        storage: this.monthlyToHourly(storageCost),
        apiCalls: this.monthlyToHourly(apiCost)
      }, {
        tier: 'Advanced',
        estimatedInteractionsThousands
      });
    }
    
    return null;
  }
}