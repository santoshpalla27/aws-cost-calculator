import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class APIGatewayPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'APIGateway');
  }

  getServiceCode() {
    return 'AmazonApiGateway';
  }

  getSupportedResourceTypes() {
    return [
      'aws_api_gateway_rest_api',
      'aws_api_gateway_stage',
      'aws_api_gateway_usage_plan',
      'aws_apigatewayv2_api',
      'aws_apigatewayv2_stage',
      'aws_api_gateway_domain_name',
      'aws_apigatewayv2_domain_name'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_api_gateway_rest_api':
        return this.calculateRestAPICost(resource, region);
      case 'aws_apigatewayv2_api':
        return this.calculateHTTPAPICost(resource, region);
      case 'aws_api_gateway_stage':
      case 'aws_apigatewayv2_stage':
        return this.calculateStageCost(resource, region);
      default:
        return null;
    }
  }

  async calculateRestAPICost(resource, region) {
    const config = resource.config;
    
    // REST API pricing: $3.50 per million requests (first 333M)
    const estimatedRequestsMillions = config._estimated_requests_millions || 1;
    const requestCost = estimatedRequestsMillions * 3.50;
    
    // Caching costs (if enabled in stage)
    // Cache sizes: 0.5GB, 1.6GB, 6.1GB, 13.5GB, 28.4GB, 58.2GB, 118GB, 237GB
    // Prices: $0.02/hour for 0.5GB up to $3.80/hour for 237GB
    
    // WebSocket connections (if applicable)
    const wsConnectionMinutes = config._estimated_ws_connection_minutes || 0;
    const wsMessageCount = config._estimated_ws_messages || 0;
    const wsCost = (wsConnectionMinutes * 0.25 / 1000000) + (wsMessageCount * 1.00 / 1000000);
    
    const monthlyCost = requestCost + wsCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      requests: this.monthlyToHourly(requestCost),
      websocket: this.monthlyToHourly(wsCost)
    }, {
      estimatedRequestsMillions,
      apiType: 'REST',
      note: 'REST API: $3.50 per million requests'
    });
  }

  async calculateHTTPAPICost(resource, region) {
    const config = resource.config;
    
    // HTTP API pricing: $1.00 per million requests (first 300M)
    const estimatedRequestsMillions = config._estimated_requests_millions || 1;
    const requestCost = estimatedRequestsMillions * 1.00;
    
    const monthlyCost = requestCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      requests: hourly
    }, {
      estimatedRequestsMillions,
      apiType: config.protocol_type || 'HTTP',
      note: 'HTTP API: $1.00 per million requests (70% cheaper than REST)'
    });
  }

  async calculateStageCost(resource, region) {
    const config = resource.config;
    
    // Stage caching cost
    let cacheCost = 0;
    if (config.cache_cluster_enabled) {
      const cacheSize = config.cache_cluster_size || '0.5';
      cacheCost = this.getCachePricing(cacheSize);
    }
    
    if (cacheCost > 0) {
      return this.formatCostResponse(cacheCost, {
        cache: cacheCost
      }, {
        cacheSize: config.cache_cluster_size,
        cacheEnabled: true
      });
    }
    
    return null;
  }

  getCachePricing(size) {
    const pricing = {
      '0.5': 0.02,
      '1.6': 0.038,
      '6.1': 0.20,
      '13.5': 0.25,
      '28.4': 0.50,
      '58.2': 1.00,
      '118': 1.90,
      '237': 3.80
    };
    return pricing[size] || 0.02;
  }
}