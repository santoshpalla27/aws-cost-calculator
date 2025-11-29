import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class ECSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'ECS');
  }

  getServiceCode() {
    return 'AmazonECS';
  }

  getSupportedResourceTypes() {
    return [
      'aws_ecs_cluster',
      'aws_ecs_service',
      'aws_ecs_task_definition',
      'aws_ecs_capacity_provider'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_ecs_cluster':
        return this.calculateClusterCost(resource, region);
      case 'aws_ecs_service':
        return this.calculateServiceCost(resource, region);
      case 'aws_ecs_task_definition':
        return null; // Task definitions don't have direct cost
      default:
        return null;
    }
  }

  async calculateClusterCost(resource, region) {
    const config = resource.config;
    
    // ECS clusters themselves are free
    // Cost comes from:
    // 1. EC2 instances (EC2 launch type) - handled by EC2 pricing
    // 2. Fargate tasks (Fargate launch type) - handled separately
    // 3. CloudWatch Container Insights (if enabled)
    
    let monthlyCost = 0;
    
    // Container Insights cost
    if (config.setting) {
      const insights = config.setting.find(s => s.name === 'containerInsights');
      if (insights?.value === 'enabled') {
        // Container Insights: $0.50 per container per month (estimated)
        const estimatedContainers = config._estimated_containers || 10;
        monthlyCost += estimatedContainers * 0.50;
      }
    }
    
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      containerInsights: hourly
    }, {
      containerInsightsEnabled: config.setting?.some(s => s.name === 'containerInsights' && s.value === 'enabled'),
      note: 'ECS cluster is free. Costs come from underlying compute (EC2 or Fargate)'
    });
  }

  async calculateServiceCost(resource, region) {
    const config = resource.config;
    const desiredCount = config.desired_count || 1;
    const launchType = config.launch_type || 'EC2';
    
    if (launchType === 'FARGATE') {
      // Fargate pricing
      const cpu = config.task_definition_cpu || 256;
      const memory = config.task_definition_memory || 512;
      
      const pricing = await this.getFargatePricing(region);
      const cpuCost = (cpu / 1024) * pricing.cpuPrice * desiredCount;
      const memoryCost = (memory / 1024) * pricing.memoryPrice * desiredCount;
      
      const hourly = cpuCost + memoryCost;

      return this.formatCostResponse(hourly, {
        cpu: cpuCost,
        memory: memoryCost
      }, {
        launchType,
        desiredCount,
        cpu,
        memory,
        region
      });
    }

    // EC2 launch type - costs come from EC2 instances
    return this.formatCostResponse(0, {}, {
      launchType,
      note: 'EC2 launch type costs are calculated through EC2 instances'
    });
  }

  async getFargatePricing(region) {
    const cacheKey = `fargate-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Fargate pricing per vCPU and GB per hour
    const pricing = {
      cpuPrice: 0.04048, // per vCPU per hour
      memoryPrice: 0.004445 // per GB per hour
    };

    this.setCache(cacheKey, pricing);
    return pricing;
  }
}