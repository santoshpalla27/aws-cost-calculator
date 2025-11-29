import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class SNSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'SNS');
  }

  getServiceCode() {
    return 'AmazonSNS';
  }

  getSupportedResourceTypes() {
    return [
      'aws_sns_topic',
      'aws_sns_topic_subscription',
      'aws_sns_platform_application',
      'aws_sns_sms_preferences'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_sns_topic':
        return this.calculateTopicCost(resource, region);
      case 'aws_sns_topic_subscription':
        return this.calculateSubscriptionCost(resource, region);
      default:
        return null;
    }
  }

  async calculateTopicCost(resource, region) {
    const config = resource.config;
    const isFifo = config.fifo_topic;
    
    // Publish requests
    const estimatedPublishesMillions = config._estimated_publishes_millions || 1;
    
    // Standard: $0.50 per million publishes (first 1M free)
    // FIFO: $0.50 per million publishes
    const publishPrice = 0.50;
    const billablePublishes = Math.max(0, estimatedPublishesMillions - (isFifo ? 0 : 1));
    const publishCost = billablePublishes * publishPrice;
    
    // Data transfer
    const estimatedDataTransferGB = config._estimated_data_transfer_gb || 0;
    const dataTransferCost = estimatedDataTransferGB * 0.09;
    
    const monthlyCost = publishCost + dataTransferCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      publishes: this.monthlyToHourly(publishCost),
      dataTransfer: this.monthlyToHourly(dataTransferCost)
    }, {
      topicType: isFifo ? 'FIFO' : 'Standard',
      estimatedPublishesMillions
    });
  }

  async calculateSubscriptionCost(resource, region) {
    const config = resource.config;
    const protocol = config.protocol;
    
    // Delivery costs vary by protocol
    const estimatedDeliveriesMillions = config._estimated_deliveries_millions || 1;
    
    let deliveryCost = 0;
    switch (protocol) {
      case 'http':
      case 'https':
        // $0.60 per million deliveries (first 1M free)
        deliveryCost = Math.max(0, estimatedDeliveriesMillions - 1) * 0.60;
        break;
      case 'email':
      case 'email-json':
        // $2.00 per 100,000 emails
        deliveryCost = (estimatedDeliveriesMillions * 1000000 / 100000) * 2.00;
        break;
      case 'sms':
        // Varies by country, ~$0.00645 per message in US
        deliveryCost = estimatedDeliveriesMillions * 1000000 * 0.00645;
        break;
      case 'sqs':
      case 'lambda':
        // No delivery charge for SQS/Lambda
        deliveryCost = 0;
        break;
    }
    
    const hourly = this.monthlyToHourly(deliveryCost);

    return this.formatCostResponse(hourly, {
      deliveries: hourly
    }, {
      protocol,
      estimatedDeliveriesMillions,
      note: protocol === 'sms' ? 'SMS costs vary significantly by destination country' : undefined
    });
  }
}