import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class CodePipelinePricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'CodePipeline');
  }

  getServiceCode() {
    return 'AWSCodePipeline';
  }

  getSupportedResourceTypes() {
    return [
      'aws_codepipeline',
      'aws_codepipeline_webhook'
    ];
  }

  async calculateCost(resource, region) {
    if (resource.type !== 'aws_codepipeline') {
      return null;
    }

    // $1.00 per active pipeline per month
    // First pipeline is free
    const isFirstPipeline = resource.config._is_first_pipeline !== false;
    
    if (isFirstPipeline) {
      return this.formatCostResponse(0, {}, {
        note: 'First active pipeline per month is free'
      });
    }
    
    const monthlyCost = 1.00;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      pipeline: hourly
    }, {
      note: 'V1 type pipelines only. V2 type pipelines have different pricing.'
    });
  }
}