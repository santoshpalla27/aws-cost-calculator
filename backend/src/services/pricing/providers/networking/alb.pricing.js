import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class ALBPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'ALB');
  }

  getServiceCode() {
    return 'AWSELB';
  }

  getSupportedResourceTypes() {
    return [
      'aws_lb',
      'aws_alb',
      'aws_lb_listener',
      'aws_alb_listener',
      'aws_lb_target_group',
      'aws_alb_target_group',
      'aws_lb_listener_rule',
      'aws_alb_listener_rule'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_lb':
      case 'aws_alb':
        return this.calculateLoadBalancerCost(resource, region);
      default:
        return null; // Listeners, target groups are free
    }
  }

  async calculateLoadBalancerCost(resource, region) {
    const config = resource.config;
    const lbType = config.load_balancer_type || 'application';
    
    const pricing = await this.getLoadBalancerPricing(lbType, region);
    
    // LCU estimation based on typical usage
    // LCU is calculated from: new connections, active connections, processed bytes, rule evaluations
    const estimatedLCU = config._estimated_lcu || 1;
    const lcuCost = estimatedLCU * pricing.lcuPrice;
    
    const hourly = pricing.hourlyPrice + lcuCost;

    return this.formatCostResponse(hourly, {
      base: pricing.hourlyPrice,
      lcu: lcuCost
    }, {
      lbType,
      estimatedLCU,
      lcuPrice: pricing.lcuPrice,
      note: 'LCU costs depend on actual traffic. Base cost is fixed.'
    });
  }

  async getLoadBalancerPricing(lbType, region) {
    const cacheKey = `lb-${lbType}-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const pricing = {
      application: {
        hourlyPrice: 0.0225,
        lcuPrice: 0.008 // per LCU-hour
      },
      network: {
        hourlyPrice: 0.0225,
        lcuPrice: 0.006 // per NLCU-hour
      },
      gateway: {
        hourlyPrice: 0.0125,
        lcuPrice: 0.004
      }
    };

    const result = pricing[lbType] || pricing.application;
    this.setCache(cacheKey, result);
    return result;
  }
}