import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class CloudTrailPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'CloudTrail');
  }

  getServiceCode() {
    return 'AWSCloudTrail';
  }

  getSupportedResourceTypes() {
    return [
      'aws_cloudtrail',
      'aws_cloudtrail_event_data_store'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_cloudtrail':
        return this.calculateTrailCost(resource, region);
      case 'aws_cloudtrail_event_data_store':
        return this.calculateEventDataStoreCost(resource, region);
      default:
        return null;
    }
  }

  async calculateTrailCost(resource, region) {
    const config = resource.config;
    
    // First trail delivering management events: free
    // Additional trails: $2.00 per 100,000 management events
    const isFirstTrail = config._is_first_trail !== false;
    
    let managementEventsCost = 0;
    if (!isFirstTrail || config.is_organization_trail) {
      const estimatedManagementEventsThousands = config._estimated_management_events_thousands || 100;
      managementEventsCost = (estimatedManagementEventsThousands / 100) * 2.00;
    }
    
    // Data events: $0.10 per 100,000 events
    let dataEventsCost = 0;
    if (config.event_selector) {
      const estimatedDataEventsThousands = config._estimated_data_events_thousands || 1000;
      dataEventsCost = (estimatedDataEventsThousands / 100) * 0.10;
    }
    
    // Insights events: $0.35 per 100,000 events analyzed
    let insightsCost = 0;
    if (config.insight_selector) {
      const estimatedInsightEventsThousands = config._estimated_insight_events_thousands || 100;
      insightsCost = (estimatedInsightEventsThousands / 100) * 0.35;
    }
    
    // S3 storage costs are separate (in S3 pricing)
    
    const monthlyCost = managementEventsCost + dataEventsCost + insightsCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      managementEvents: this.monthlyToHourly(managementEventsCost),
      dataEvents: this.monthlyToHourly(dataEventsCost),
      insights: this.monthlyToHourly(insightsCost)
    }, {
      isFirstTrail,
      isOrganizationTrail: config.is_organization_trail,
      hasDataEvents: !!config.event_selector,
      hasInsights: !!config.insight_selector,
      note: 'First trail for management events is free. S3 storage costs are separate.'
    });
  }

  async calculateEventDataStoreCost(resource, region) {
    const config = resource.config;
    
    // Event ingestion: $2.50 per GB
    const estimatedIngestionGB = config._estimated_ingestion_gb || 10;
    const ingestionCost = estimatedIngestionGB * 2.50;
    
    // Storage: $0.023 per GB-month (7-year retention)
    const retentionDays = config.retention_period || 2555; // Default 7 years
    const estimatedStorageGB = estimatedIngestionGB * (retentionDays / 30);
    const storageCost = estimatedStorageGB * 0.023;
    
    // Lake queries: $0.005 per GB scanned
    const estimatedQueriesGB = config._estimated_queries_gb || 5;
    const queryCost = estimatedQueriesGB * 0.005;
    
    const monthlyCost = ingestionCost + storageCost + queryCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      ingestion: this.monthlyToHourly(ingestionCost),
      storage: this.monthlyToHourly(storageCost),
      queries: this.monthlyToHourly(queryCost)
    }, {
      retentionDays,
      estimatedIngestionGB,
      estimatedStorageGB
    });
  }
}