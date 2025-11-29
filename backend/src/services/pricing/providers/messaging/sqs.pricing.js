import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class SQSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'SQS');
  }

  getServiceCode() {
    return 'AWSQueueService';
  }

  getSupportedResourceTypes() {
    return [
      'aws_sqs_queue',
      'aws_sqs_queue_policy',
      'aws_sqs_queue_redrive_policy',
      'aws_sqs_queue_redrive_allow_policy'
    ];
  }

  async calculateCost(resource, region) {
    if (resource.type !== 'aws_sqs_queue') {
      return null;
    }

    const config = resource.config;
    const isFifo = config.fifo_queue || config.name?.endsWith('.fifo');
    
    // Estimate request volume
    const estimatedRequestsMillions = config._estimated_requests_millions || 1;
    
    // Standard queue: First 1M free, then $0.40 per million
    // FIFO queue: First 1M free, then $0.50 per million
    const pricePerMillion = isFifo ? 0.50 : 0.40;
    const billableRequests = Math.max(0, estimatedRequestsMillions - 1);
    const requestCost = billableRequests * pricePerMillion;
    
    // Data transfer (inter-region)
    const estimatedDataTransferGB = config._estimated_data_transfer_gb || 0;
    const dataTransferCost = estimatedDataTransferGB * 0.09;
    
    const monthlyCost = requestCost + dataTransferCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      requests: this.monthlyToHourly(requestCost),
      dataTransfer: this.monthlyToHourly(dataTransferCost)
    }, {
      queueType: isFifo ? 'FIFO' : 'Standard',
      estimatedRequestsMillions,
      estimatedDataTransferGB,
      note: 'First 1 million requests per month are free'
    });
  }
}