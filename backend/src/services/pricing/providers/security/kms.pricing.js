import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class KMSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'KMS');
  }

  getServiceCode() {
    return 'awskms';
  }

  getSupportedResourceTypes() {
    return [
      'aws_kms_key',
      'aws_kms_alias',
      'aws_kms_replica_key',
      'aws_kms_external_key',
      'aws_kms_grant'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_kms_key':
        return this.calculateKeyCost(resource, region);
      case 'aws_kms_replica_key':
        return this.calculateReplicaKeyCost(resource, region);
      case 'aws_kms_external_key':
        return this.calculateExternalKeyCost(resource, region);
      default:
        return null;
    }
  }

  async calculateKeyCost(resource, region) {
    const config = resource.config;
    
    // Customer managed keys: $1.00/month
    // AWS managed keys: free (but created automatically by services)
    const keyType = config.customer_master_key_spec || 'SYMMETRIC_DEFAULT';
    
    let keyMonthlyCost = 1.00;
    
    // Asymmetric keys are more expensive based on type
    if (keyType.startsWith('RSA') || keyType.startsWith('ECC')) {
      keyMonthlyCost = 1.00; // Same base cost
    }
    
    // Request pricing
    // Symmetric: $0.03 per 10,000 requests
    // Asymmetric RSA: $0.03-$0.15 per 10,000
    // Asymmetric ECC: $0.10-$0.15 per 10,000
    const estimatedRequestsThousands = config._estimated_requests_thousands || 10;
    let requestCost = 0;
    
    if (keyType === 'SYMMETRIC_DEFAULT') {
      requestCost = (estimatedRequestsThousands / 10) * 0.03;
    } else if (keyType.startsWith('RSA')) {
      requestCost = (estimatedRequestsThousands / 10) * 0.15;
    } else if (keyType.startsWith('ECC')) {
      requestCost = (estimatedRequestsThousands / 10) * 0.15;
    }
    
    // Multi-region keys: additional cost per replica
    let multiRegionCost = 0;
    if (config.multi_region) {
      const replicaCount = config._replica_count || 1;
      multiRegionCost = replicaCount * 1.00; // $1/month per replica
    }
    
    const monthlyCost = keyMonthlyCost + requestCost + multiRegionCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      key: this.monthlyToHourly(keyMonthlyCost),
      requests: this.monthlyToHourly(requestCost),
      multiRegion: this.monthlyToHourly(multiRegionCost)
    }, {
      keyType,
      multiRegion: config.multi_region,
      estimatedRequestsThousands
    });
  }

  async calculateReplicaKeyCost(resource, region) {
    // Replica keys: $1.00/month each
    const hourly = this.monthlyToHourly(1.00);

    return this.formatCostResponse(hourly, {
      key: hourly
    }, {
      note: 'Multi-region replica key'
    });
  }

  async calculateExternalKeyCost(resource, region) {
    // External key material: same pricing as regular keys
    return this.calculateKeyCost(resource, region);
  }
}