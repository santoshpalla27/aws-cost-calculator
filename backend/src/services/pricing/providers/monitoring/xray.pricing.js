import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class XRayPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'XRay');
  }

  getServiceCode() {
    return 'AWSXRay';
  }

  getSupportedResourceTypes() {
    return [
      'aws_xray_sampling_rule',
      'aws_xray_group'
    ];
  }

  async calculateCost(resource, region) {
    // X-Ray pricing is based on traces recorded and retrieved
    // Configuration resources don't have direct costs
    
    if (resource.type === 'aws_xray_sampling_rule') {
      return this.calculateSamplingRuleCost(resource, region);
    }
    
    return null;
  }

  async calculateSamplingRuleCost(resource, region) {
    const config = resource.config;
    
    // Estimate traces based on sampling rate
    const fixedRate = config.fixed_rate || 0.05;
    const estimatedRequestsMillions = config._estimated_requests_millions || 10;
    const tracesRecorded = estimatedRequestsMillions * 1000000 * fixedRate;
    
    // First 100,000 traces: free
    // Then: $5.00 per million traces recorded
    const billableTracesMillions = Math.max(0, (tracesRecorded - 100000) / 1000000);
    const recordCost = billableTracesMillions * 5.00;
    
    // Traces retrieved: $0.50 per million
    const estimatedRetrievedMillions = billableTracesMillions * 0.1; // 10% retrieval estimate
    const retrievalCost = estimatedRetrievedMillions * 0.50;
    
    // Traces scanned: $0.50 per million
    const scanCost = estimatedRetrievedMillions * 0.50;
    
    const monthlyCost = recordCost + retrievalCost + scanCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      record: this.monthlyToHourly(recordCost),
      retrieval: this.monthlyToHourly(retrievalCost),
      scan: this.monthlyToHourly(scanCost)
    }, {
      fixedRate,
      estimatedTracesRecorded: tracesRecorded,
      note: 'First 100,000 traces per month are free'
    });
  }
}