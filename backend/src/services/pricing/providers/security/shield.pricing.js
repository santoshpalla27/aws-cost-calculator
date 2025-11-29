import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class ShieldPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'Shield');
  }

  getServiceCode() {
    return 'AWSShield';
  }

  getSupportedResourceTypes() {
    return [
      'aws_shield_protection',
      'aws_shield_protection_group',
      'aws_shield_subscription'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_shield_protection':
        // Shield Standard is free, Advanced has separate subscription
        return null;
      case 'aws_shield_subscription':
        return this.calculateSubscriptionCost(resource, region);
      default:
        return null;
    }
  }

  async calculateSubscriptionCost(resource, region) {
    // Shield Advanced: $3,000/month base fee
    const baseFee = 3000.00;
    
    // Data transfer out fee: $0.025-$0.05 per GB
    const estimatedDataTransferTB = resource.config._estimated_data_transfer_tb || 10;
    const dataTransferCost = estimatedDataTransferTB * 1024 * 0.05;
    
    const monthlyCost = baseFee + dataTransferCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      subscription: this.monthlyToHourly(baseFee),
      dataTransfer: this.monthlyToHourly(dataTransferCost)
    }, {
      estimatedDataTransferTB,
      note: 'Shield Advanced: $3,000/month + data transfer fees. 1-year commitment required.'
    });
  }
}