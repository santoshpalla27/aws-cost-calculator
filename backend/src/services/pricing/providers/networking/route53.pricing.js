import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class Route53PricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'Route53');
  }

  getServiceCode() {
    return 'AmazonRoute53';
  }

  getSupportedResourceTypes() {
    return [
      'aws_route53_zone',
      'aws_route53_record',
      'aws_route53_health_check',
      'aws_route53_query_log',
      'aws_route53_resolver_endpoint',
      'aws_route53_resolver_rule',
      'aws_route53_traffic_policy',
      'aws_route53_traffic_policy_instance'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_route53_zone':
        return this.calculateHostedZoneCost(resource, region);
      case 'aws_route53_record':
        return this.calculateRecordCost(resource, region);
      case 'aws_route53_health_check':
        return this.calculateHealthCheckCost(resource, region);
      case 'aws_route53_resolver_endpoint':
        return this.calculateResolverEndpointCost(resource, region);
      default:
        return null;
    }
  }

  async calculateHostedZoneCost(resource, region) {
    // $0.50 per hosted zone per month (first 25 zones)
    const monthlyCost = 0.50;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      hostedZone: hourly
    }, {
      note: 'First 25 hosted zones: $0.50/month each. 26+: $0.10/month each'
    });
  }

  async calculateRecordCost(resource, region) {
    const config = resource.config;
    
    // Records are free, but queries cost money
    // Estimate query volume
    const estimatedQueriesMillions = config._estimated_queries_millions || 1;
    
    // Standard queries: $0.40 per million
    let queryPrice = 0.40;
    
    // Latency-based routing: $0.60 per million
    if (config.latency_routing_policy) {
      queryPrice = 0.60;
    }
    
    // Geolocation routing: $0.70 per million
    if (config.geolocation_routing_policy) {
      queryPrice = 0.70;
    }
    
    // Alias records to AWS resources: free queries
    if (config.alias) {
      const aliasTarget = config.alias[0]?.name || '';
      if (aliasTarget.includes('elb.') || 
          aliasTarget.includes('cloudfront.') || 
          aliasTarget.includes('s3-website')) {
        queryPrice = 0;
      }
    }
    
    const monthlyCost = estimatedQueriesMillions * queryPrice;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      queries: hourly
    }, {
      estimatedQueriesMillions,
      queryPrice,
      note: queryPrice === 0 ? 'Alias records to AWS resources have free queries' : 'Cost based on query volume'
    });
  }

  async calculateHealthCheckCost(resource, region) {
    const config = resource.config;
    
    // Basic health check: $0.50/month
    let monthlyCost = 0.50;
    
    // HTTPS: $1.00/month
    if (config.type === 'HTTPS' || config.type === 'HTTPS_STR_MATCH') {
      monthlyCost = 1.00;
    }
    
    // String matching: $2.00/month
    if (config.type?.includes('STR_MATCH')) {
      monthlyCost = 2.00;
    }
    
    // Fast interval (10 seconds): +$1.00/month
    if (config.request_interval === 10) {
      monthlyCost += 1.00;
    }
    
    // Latency measurement: +$1.00/month
    if (config.measure_latency) {
      monthlyCost += 1.00;
    }
    
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      healthCheck: hourly
    }, {
      type: config.type,
      requestInterval: config.request_interval,
      measureLatency: config.measure_latency
    });
  }

  async calculateResolverEndpointCost(resource, region) {
    const config = resource.config;
    
    // $0.125 per ENI per hour
    const eniCount = config.ip_address?.length || 2;
    const hourly = 0.125 * eniCount;
    
    // Query processing: $0.40 per million queries
    const estimatedQueriesMillions = config._estimated_queries_millions || 1;
    const queryCost = this.monthlyToHourly(estimatedQueriesMillions * 0.40);
    
    const total = hourly + queryCost;

    return this.formatCostResponse(total, {
      endpoints: hourly,
      queries: queryCost
    }, {
      eniCount,
      estimatedQueriesMillions
    });
  }
}