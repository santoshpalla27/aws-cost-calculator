import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class StepFunctionsPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'StepFunctions');
  }

  getServiceCode() {
    return 'AWSStepFunctions';
  }

  getSupportedResourceTypes() {
    return [
      'aws_sfn_state_machine',
      'aws_sfn_activity'
    ];
  }

  async calculateCost(resource, region) {
    if (resource.type !== 'aws_sfn_state_machine') {
      return null;
    }

    const config = resource.config;
    const type = config.type || 'STANDARD';
    
    if (type === 'EXPRESS') {
      return this.calculateExpressCost(resource, region);
    }
    
    return this.calculateStandardCost(resource, region);
  }

  async calculateStandardCost(resource, region) {
    const config = resource.config;
    
    // Standard: $0.025 per 1,000 state transitions
    // First 4,000 transitions per month are free
    const estimatedTransitionsThousands = config._estimated_transitions_thousands || 10;
    const billableTransitions = Math.max(0, estimatedTransitionsThousands - 4);
    const transitionCost = billableTransitions * 0.025;
    
    const hourly = this.monthlyToHourly(transitionCost);

    return this.formatCostResponse(hourly, {
      transitions: hourly
    }, {
      type: 'STANDARD',
      estimatedTransitionsThousands,
      note: 'First 4,000 state transitions per month are free'
    });
  }

  async calculateExpressCost(resource, region) {
    const config = resource.config;
    
    // Express: $1.00 per 1 million requests + duration charges
    const estimatedRequestsMillions = config._estimated_requests_millions || 1;
    const requestCost = estimatedRequestsMillions * 1.00;
    
    // Duration: $0.00001667 per GB-second
    const estimatedDurationSeconds = config._estimated_duration_seconds || 1000;
    const memoryGB = config._estimated_memory_gb || 0.064;
    const gbSeconds = memoryGB * estimatedDurationSeconds * estimatedRequestsMillions * 1000000;
    const durationCost = gbSeconds * 0.00001667 / 1000000; // Adjust for monthly estimate
    
    const monthlyCost = requestCost + durationCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      requests: this.monthlyToHourly(requestCost),
      duration: this.monthlyToHourly(durationCost)
    }, {
      type: 'EXPRESS',
      estimatedRequestsMillions
    });
  }
}