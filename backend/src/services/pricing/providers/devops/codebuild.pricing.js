import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class CodeBuildPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'CodeBuild');
  }

  getServiceCode() {
    return 'AWSCodeBuild';
  }

  getSupportedResourceTypes() {
    return [
      'aws_codebuild_project',
      'aws_codebuild_report_group',
      'aws_codebuild_source_credential',
      'aws_codebuild_webhook'
    ];
  }

  async calculateCost(resource, region) {
    if (resource.type !== 'aws_codebuild_project') {
      return null;
    }

    const config = resource.config;
    const computeType = config.environment?.[0]?.compute_type || 'BUILD_GENERAL1_SMALL';
    
    // Get pricing per minute for compute type
    const pricePerMinute = this.getComputePricing(computeType);
    
    // Estimate build minutes per month
    const estimatedBuildMinutes = config._estimated_build_minutes || 100;
    const buildCost = estimatedBuildMinutes * pricePerMinute;
    
    // Cache storage (if using S3 cache)
    let cacheCost = 0;
    if (config.cache) {
      const cacheType = config.cache[0]?.type;
      if (cacheType === 'S3') {
        const estimatedCacheGB = config._estimated_cache_gb || 5;
        cacheCost = estimatedCacheGB * 0.023; // S3 Standard pricing
      }
    }
    
    const monthlyCost = buildCost + cacheCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      compute: this.monthlyToHourly(buildCost),
      cache: this.monthlyToHourly(cacheCost)
    }, {
      computeType,
      estimatedBuildMinutes,
      pricePerMinute,
      note: 'First 100 build minutes per month are free'
    });
  }

  getComputePricing(computeType) {
    // Price per build minute
    const pricing = {
      'BUILD_GENERAL1_SMALL': 0.005,
      'BUILD_GENERAL1_MEDIUM': 0.01,
      'BUILD_GENERAL1_LARGE': 0.02,
      'BUILD_GENERAL1_2XLARGE': 0.04,
      'BUILD_LAMBDA_1GB': 0.00003,
      'BUILD_LAMBDA_2GB': 0.00006,
      'BUILD_LAMBDA_4GB': 0.00012,
      'BUILD_LAMBDA_8GB': 0.00024,
      'BUILD_LAMBDA_10GB': 0.0003,
      'ARM_CONTAINER_SMALL': 0.0034,
      'ARM_CONTAINER_MEDIUM': 0.007,
      'ARM_CONTAINER_LARGE': 0.014
    };
    return pricing[computeType] || 0.01;
  }
}