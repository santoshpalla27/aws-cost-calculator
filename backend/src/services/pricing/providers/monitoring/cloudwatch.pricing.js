import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class CloudWatchPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'CloudWatch');
  }

  getServiceCode() {
    return 'AmazonCloudWatch';
  }

  getSupportedResourceTypes() {
    return [
      'aws_cloudwatch_metric_alarm',
      'aws_cloudwatch_composite_alarm',
      'aws_cloudwatch_dashboard',
      'aws_cloudwatch_log_group',
      'aws_cloudwatch_log_stream',
      'aws_cloudwatch_log_metric_filter',
      'aws_cloudwatch_log_subscription_filter',
      'aws_cloudwatch_metric_stream',
      'aws_cloudwatch_query_definition'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_cloudwatch_metric_alarm':
        return this.calculateAlarmCost(resource, region);
      case 'aws_cloudwatch_composite_alarm':
        return this.calculateCompositeAlarmCost(resource, region);
      case 'aws_cloudwatch_dashboard':
        return this.calculateDashboardCost(resource, region);
      case 'aws_cloudwatch_log_group':
        return this.calculateLogGroupCost(resource, region);
      case 'aws_cloudwatch_metric_stream':
        return this.calculateMetricStreamCost(resource, region);
      default:
        return null;
    }
  }

  async calculateAlarmCost(resource, region) {
    const config = resource.config;
    
    // Standard resolution (60 seconds): $0.10 per alarm per month
    // High resolution (10 seconds): $0.30 per alarm per month
    const isHighResolution = config.period && config.period < 60;
    const alarmCost = isHighResolution ? 0.30 : 0.10;
    
    // Anomaly detection: additional $0.30 per alarm per month
    let anomalyDetectionCost = 0;
    if (config.threshold_metric_id) {
      anomalyDetectionCost = 0.30;
    }
    
    const monthlyCost = alarmCost + anomalyDetectionCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      alarm: this.monthlyToHourly(alarmCost),
      anomalyDetection: this.monthlyToHourly(anomalyDetectionCost)
    }, {
      highResolution: isHighResolution,
      hasAnomalyDetection: !!config.threshold_metric_id
    });
  }

  async calculateCompositeAlarmCost(resource, region) {
    // Composite alarms: $0.50 per alarm per month
    const hourly = this.monthlyToHourly(0.50);

    return this.formatCostResponse(hourly, {
      alarm: hourly
    }, {
      type: 'composite'
    });
  }

  async calculateDashboardCost(resource, region) {
    // First 3 dashboards: free
    // Additional dashboards: $3.00 per month
    // Assuming this is an additional dashboard
    const hourly = this.monthlyToHourly(3.00);

    return this.formatCostResponse(hourly, {
      dashboard: hourly
    }, {
      note: 'First 3 dashboards are free'
    });
  }

  async calculateLogGroupCost(resource, region) {
    const config = resource.config;
    
    // Log ingestion: $0.50 per GB
    const estimatedIngestionGB = config._estimated_ingestion_gb || 10;
    const ingestionCost = estimatedIngestionGB * 0.50;
    
    // Log storage: $0.03 per GB per month
    const retentionDays = config.retention_in_days || 0; // 0 = never expire
    const estimatedStorageGB = estimatedIngestionGB * (retentionDays > 0 ? retentionDays / 30 : 12);
    const storageCost = estimatedStorageGB * 0.03;
    
    // Logs Insights queries: $0.005 per GB scanned
    const estimatedQueriesGB = config._estimated_queries_gb || 5;
    const queryCost = estimatedQueriesGB * 0.005;
    
    // Cross-account log data sharing
    let sharingCost = 0;
    if (config._cross_account_sharing) {
      sharingCost = estimatedIngestionGB * 0.10;
    }
    
    const monthlyCost = ingestionCost + storageCost + queryCost + sharingCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      ingestion: this.monthlyToHourly(ingestionCost),
      storage: this.monthlyToHourly(storageCost),
      queries: this.monthlyToHourly(queryCost),
      sharing: this.monthlyToHourly(sharingCost)
    }, {
      retentionDays,
      estimatedIngestionGB,
      estimatedStorageGB
    });
  }

  async calculateMetricStreamCost(resource, region) {
    // $0.003 per 1,000 metric updates
    const estimatedUpdatesMillions = resource.config._estimated_updates_millions || 10;
    const updateCost = estimatedUpdatesMillions * 1000 * 0.003;
    
    const hourly = this.monthlyToHourly(updateCost);

    return this.formatCostResponse(hourly, {
      updates: hourly
    }, {
      estimatedUpdatesMillions
    });
  }
}