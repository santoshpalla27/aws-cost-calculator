import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class CloudFrontPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'CloudFront');
  }

  getServiceCode() {
    return 'AmazonCloudFront';
  }

  getSupportedResourceTypes() {
    return [
      'aws_cloudfront_distribution',
      'aws_cloudfront_function',
      'aws_cloudfront_origin_access_identity',
      'aws_cloudfront_origin_access_control',
      'aws_cloudfront_cache_policy',
      'aws_cloudfront_origin_request_policy',
      'aws_cloudfront_response_headers_policy',
      'aws_cloudfront_realtime_log_config'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_cloudfront_distribution':
        return this.calculateDistributionCost(resource, region);
      case 'aws_cloudfront_function':
        return this.calculateFunctionCost(resource, region);
      default:
        return null;
    }
  }

  async calculateDistributionCost(resource, region) {
    const config = resource.config;
    const priceClass = config.price_class || 'PriceClass_All';
    
    // Estimate based on assumed traffic
    const estimatedRequestsMillions = config._estimated_requests_millions || 10;
    const estimatedDataTransferTB = config._estimated_data_transfer_tb || 1;
    
    // Request pricing (varies by region)
    const requestPrice = this.getRequestPricing(priceClass);
    const requestCost = estimatedRequestsMillions * requestPrice;
    
    // Data transfer pricing
    const dataTransferPrice = this.getDataTransferPricing(priceClass);
    const dataTransferCost = estimatedDataTransferTB * 1024 * dataTransferPrice; // Convert TB to GB
    
    // Origin Shield (if enabled)
    let originShieldCost = 0;
    if (config.origin?.[0]?.origin_shield?.[0]?.enabled) {
      originShieldCost = estimatedRequestsMillions * 0.0075; // $0.0075 per 10,000 requests
    }
    
    // Field-level encryption
    let encryptionCost = 0;
    if (config.default_cache_behavior?.[0]?.field_level_encryption_id) {
      encryptionCost = estimatedRequestsMillions * 0.02; // $0.02 per 10,000 requests
    }
    
    const monthlyCost = requestCost + dataTransferCost + originShieldCost + encryptionCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      requests: this.monthlyToHourly(requestCost),
      dataTransfer: this.monthlyToHourly(dataTransferCost),
      originShield: this.monthlyToHourly(originShieldCost),
      encryption: this.monthlyToHourly(encryptionCost)
    }, {
      priceClass,
      estimatedRequestsMillions,
      estimatedDataTransferTB,
      note: 'CloudFront costs vary significantly based on traffic patterns'
    });
  }

  async calculateFunctionCost(resource, region) {
    // CloudFront Functions: $0.10 per million invocations
    const estimatedInvocations = resource.config._estimated_invocations || 1000000;
    const monthlyCost = (estimatedInvocations / 1000000) * 0.10;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      invocations: hourly
    }, {
      estimatedInvocations
    });
  }

  getRequestPricing(priceClass) {
    // Per 10,000 requests
    const pricing = {
      'PriceClass_All': 0.0100,
      'PriceClass_200': 0.0100,
      'PriceClass_100': 0.0085
    };
    return (pricing[priceClass] || 0.0100) / 10000 * 1000000; // Convert to per million
  }

  getDataTransferPricing(priceClass) {
    // Per GB (first 10TB)
    return 0.085;
  }
}