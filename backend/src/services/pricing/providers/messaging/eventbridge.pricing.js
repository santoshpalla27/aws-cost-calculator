import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class EventBridgePricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'EventBridge');
  }

  getServiceCode() {
    return 'AmazonEventBridge';
  }

  getSupportedResourceTypes() {
    return [
      'aws_cloudwatch_event_bus',
      'aws_cloudwatch_event_rule',
      'aws_cloudwatch_event_target',
      'aws_cloudwatch_event_archive',
      'aws_cloudwatch_event_api_destination',
      'aws_schemas_registry',
      'aws_schemas_schema',
      'aws_scheduler_schedule',
      'aws_scheduler_schedule_group',
      'aws_pipes_pipe'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_cloudwatch_event_bus':
        return this.calculateEventBusCost(resource, region);
      case 'aws_cloudwatch_event_rule':
        return this.calculateRuleCost(resource, region);
      case 'aws_cloudwatch_event_archive':
        return this.calculateArchiveCost(resource, region);
      case 'aws_cloudwatch_event_api_destination':
        return this.calculateApiDestinationCost(resource, region);
      case 'aws_scheduler_schedule':
        return this.calculateSchedulerCost(resource, region);
      case 'aws_pipes_pipe':
        return this.calculatePipesCost(resource, region);
      default:
        return null;
    }
  }

  async calculateEventBusCost(resource, region) {
    const config = resource.config;
    
    // Custom event bus: $1.00 per million custom events
    const estimatedEventsMillions = config._estimated_events_millions || 1;
    const eventCost = estimatedEventsMillions * 1.00;
    
    // Cross-account event delivery
    const crossAccountEvents = config._estimated_cross_account_events_millions || 0;
    const crossAccountCost = crossAccountEvents * 1.00;
    
    const monthlyCost = eventCost + crossAccountCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      events: this.monthlyToHourly(eventCost),
      crossAccount: this.monthlyToHourly(crossAccountCost)
    }, {
      estimatedEventsMillions,
      note: 'Default event bus events from AWS services are free'
    });
  }

  async calculateRuleCost(resource, region) {
    // Rules themselves are free, cost is in event processing
    return null;
  }

  async calculateArchiveCost(resource, region) {
    const config = resource.config;
    
    // Archive: $0.10 per GB stored
    const estimatedStorageGB = config._estimated_storage_gb || 1;
    const storageCost = estimatedStorageGB * 0.10;
    
    // Replay: $0.10 per million events replayed
    const estimatedReplaysMillions = config._estimated_replays_millions || 0;
    const replayCost = estimatedReplaysMillions * 0.10;
    
    const monthlyCost = storageCost + replayCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: this.monthlyToHourly(storageCost),
      replay: this.monthlyToHourly(replayCost)
    }, {
      estimatedStorageGB,
      estimatedReplaysMillions
    });
  }

  async calculateApiDestinationCost(resource, region) {
    const config = resource.config;
    
    // $0.20 per million invocations
    const estimatedInvocationsMillions = config._estimated_invocations_millions || 1;
    const invocationCost = estimatedInvocationsMillions * 0.20;
    
    const hourly = this.monthlyToHourly(invocationCost);

    return this.formatCostResponse(hourly, {
      invocations: hourly
    }, {
      estimatedInvocationsMillions
    });
  }

  async calculateSchedulerCost(resource, region) {
    const config = resource.config;
    
    // $1.00 per million scheduler invocations
    const estimatedInvocationsMillions = config._estimated_invocations_millions || 0.1;
    const invocationCost = estimatedInvocationsMillions * 1.00;
    
    const hourly = this.monthlyToHourly(invocationCost);

    return this.formatCostResponse(hourly, {
      invocations: hourly
    }, {
      estimatedInvocationsMillions,
      scheduleExpression: config.schedule_expression
    });
  }

  async calculatePipesCost(resource, region) {
    const config = resource.config;
    
    // $0.40 per million 64KB chunks
    const estimatedRequestsMillions = config._estimated_requests_millions || 1;
    const requestCost = estimatedRequestsMillions * 0.40;
    
    const hourly = this.monthlyToHourly(requestCost);

    return this.formatCostResponse(hourly, {
      requests: hourly
    }, {
      estimatedRequestsMillions,
      note: 'Cost based on 64KB message chunks processed'
    });
  }
}