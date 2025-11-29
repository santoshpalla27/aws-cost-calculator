import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class LambdaPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'Lambda');
  }

  getServiceCode() {
    return 'AWSLambda';
  }

  getSupportedResourceTypes() {
    return [
      'aws_lambda_function',
      'aws_lambda_alias',
      'aws_lambda_event_source_mapping',
      'aws_lambda_function_url',
      'aws_lambda_provisioned_concurrency_config'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_lambda_function':
        return this.calculateFunctionCost(resource, region);
      case 'aws_lambda_provisioned_concurrency_config':
        return this.calculateProvisionedConcurrencyCost(resource, region);
      default:
        return null;
    }
  }

  async calculateFunctionCost(resource, region) {
    const config = resource.config;
    const memorySize = config.memory_size || 128;
    const timeout = config.timeout || 3;
    const architecture = config.architectures?.[0] || 'x86_64';
    
    // Lambda pricing components:
    // 1. Request charges: $0.20 per 1M requests
    // 2. Duration charges: based on memory and execution time
    // 3. Provisioned concurrency (if configured)
    // 4. Ephemeral storage (if > 512MB)

    const pricing = await this.getLambdaPricing(region, architecture);
    
    // Estimate based on assumed invocations (default: 1M/month)
    const estimatedInvocations = config._estimated_invocations || 1000000;
    const estimatedDurationMs = config._estimated_duration_ms || (timeout * 1000 * 0.1); // 10% of timeout
    
    // Request cost
    const requestCost = (estimatedInvocations / 1000000) * pricing.requestPrice;
    
    // Duration cost (GB-seconds)
    const gbSeconds = (memorySize / 1024) * (estimatedDurationMs / 1000) * estimatedInvocations;
    const durationCost = gbSeconds * pricing.durationPrice;
    
    // Ephemeral storage cost
    let storageCost = 0;
    const ephemeralStorage = config.ephemeral_storage?.[0]?.size || 512;
    if (ephemeralStorage > 512) {
      const extraStorageGB = (ephemeralStorage - 512) / 1024;
      storageCost = extraStorageGB * estimatedDurationMs / 1000 * estimatedInvocations * pricing.storagePrice;
    }
    
    const monthlyCost = requestCost + durationCost + storageCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      requests: this.monthlyToHourly(requestCost),
      duration: this.monthlyToHourly(durationCost),
      storage: this.monthlyToHourly(storageCost)
    }, {
      memorySize,
      timeout,
      architecture,
      ephemeralStorage,
      estimatedInvocations,
      estimatedDurationMs,
      note: 'Cost estimate based on assumed invocations. Actual cost depends on usage.'
    });
  }

  async calculateProvisionedConcurrencyCost(resource, region) {
    const config = resource.config;
    const provisionedConcurrency = config.provisioned_concurrent_executions || 1;
    
    // Provisioned concurrency: $0.000004167 per GB-second provisioned
    const pricing = await this.getLambdaPricing(region);
    
    // Assuming the function memory from the associated function (default 128MB)
    const memoryMB = config._function_memory || 128;
    const gbSeconds = (memoryMB / 1024) * 3600 * 730; // Per month
    const monthlyCost = gbSeconds * pricing.provisionedConcurrencyPrice * provisionedConcurrency;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      provisionedConcurrency: hourly
    }, {
      provisionedConcurrency,
      memoryMB,
      note: 'Provisioned concurrency is charged even when not in use'
    });
  }

  async getLambdaPricing(region, architecture = 'x86_64') {
    const cacheKey = `lambda-${region}-${architecture}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Lambda pricing (as of 2024)
    const pricing = {
      'x86_64': {
        requestPrice: 0.20, // per 1M requests
        durationPrice: 0.0000166667, // per GB-second
        storagePrice: 0.0000000309, // per GB-second for ephemeral storage
        provisionedConcurrencyPrice: 0.000004167 // per GB-second
      },
      'arm64': {
        requestPrice: 0.20,
        durationPrice: 0.0000133334, // 20% cheaper than x86
        storagePrice: 0.0000000309,
        provisionedConcurrencyPrice: 0.000003333
      }
    };

    const result = pricing[architecture] || pricing['x86_64'];
    this.setCache(cacheKey, result);
    return result;
  }
}