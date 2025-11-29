import logger from '../config/logger.config.js';

export class CostCalculatorService {
  constructor(pricingService, metadataService, mockerService) {
    this.pricingService = pricingService;
    this.metadataService = metadataService;
    this.mockerService = mockerService;
  }

  async calculateTotalCost(resources, region = 'us-east-1') {
    const costBreakdown = {
      resources: [],
      summary: { hourly: 0, daily: 0, monthly: 0, yearly: 0 },
      region,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      mockingReport: null,
      errors: []
    };

    // Mock only cost-critical missing values
    const processedResources = [];
    for (const resource of resources) {
      const mockedResult = this.mockerService.mockResourceConfig(resource);
      processedResources.push({
        ...resource,
        config: mockedResult.config,
        mocked: mockedResult.mocked
      });
    }

    // Calculate costs
    for (const resource of processedResources) {
      try {
        const cost = await this.calculateResourceCost(resource, region);
        if (cost) {
          costBreakdown.resources.push({
            type: resource.type,
            name: resource.name,
            module: resource.module,
            ...cost,
            mockedAttributes: resource.mocked?.attributes || []
          });
          costBreakdown.summary.hourly += cost.hourly || 0;
        }
      } catch (error) {
        logger.error(`Error calculating cost for ${resource.type}.${resource.name}:`, error);
        costBreakdown.errors.push({
          resource: `${resource.type}.${resource.name}`,
          error: error.message
        });
      }
    }

    // Calculate time-based totals
    costBreakdown.summary.daily = costBreakdown.summary.hourly * 24;
    costBreakdown.summary.monthly = costBreakdown.summary.daily * 30;
    costBreakdown.summary.yearly = costBreakdown.summary.daily * 365;

    costBreakdown.mockingReport = this.mockerService.generateMockingReport(processedResources);

    return costBreakdown;
  }

  async calculateResourceCost(resource, region) {
    switch (resource.type) {
      case 'aws_instance':
        return await this.calculateEC2Cost(resource, region);
      case 'aws_db_instance':
        return await this.calculateRDSCost(resource, region);
      case 'aws_ebs_volume':
        return await this.calculateEBSCost(resource, region);
      case 'aws_elasticache_cluster':
      case 'aws_elasticache_replication_group':
        return await this.calculateElastiCacheCost(resource, region);
      case 'aws_lb':
      case 'aws_alb':
        return await this.calculateLoadBalancerCost(resource, region);
      case 'aws_nat_gateway':
        return await this.calculateNATGatewayCost(resource, region);
      case 'aws_cloudwatch_metric_alarm':
        return await this.calculateCloudWatchAlarmCost(resource, region);
      case 'aws_launch_template':
        return await this.calculateLaunchTemplateCost(resource, region);
      case 'aws_autoscaling_group':
        return await this.calculateAutoScalingGroupCost(resource, region);
      default:
        logger.debug(`Cost calculation not supported for ${resource.type}`);
        return null;
    }
  }

  async calculateEC2Cost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type;
    
    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');
    let hourlyCost = pricing.pricePerHour;

    // EBS volumes
    let ebsCost = 0;
    if (config.root_block_device) {
      const volumeSize = config.root_block_device.volume_size || 8;
      const volumeType = config.root_block_device.volume_type || 'gp2';
      const ebsPricing = await this.pricingService.getEBSPricing(volumeType, region);
      ebsCost = (ebsPricing.pricePerGBMonth * volumeSize) / 730;
    }

    return {
      hourly: hourlyCost + ebsCost,
      breakdown: { compute: hourlyCost, storage: ebsCost },
      details: { instanceType, region }
    };
  }

  async calculateRDSCost(resource, region) {
    const config = resource.config;
    const pricing = await this.pricingService.getRDSPricing(
      config.instance_class,
      config.engine,
      region,
      config.multi_az ? 'Multi-AZ' : 'Single-AZ'
    );

    let instanceCost = pricing.pricePerHour;
    if (config.multi_az) instanceCost *= 2;

    const allocatedStorage = config.allocated_storage || 20;
    const storageType = config.storage_type || 'gp2';
    const storagePricing = await this.pricingService.getEBSPricing(storageType, region);
    const storageCost = (storagePricing.pricePerGBMonth * allocatedStorage) / 730;

    return {
      hourly: instanceCost + storageCost,
      breakdown: { compute: instanceCost, storage: storageCost },
      details: { instanceClass: config.instance_class, engine: config.engine, region }
    };
  }

  async calculateEBSCost(resource, region) {
    const config = resource.config;
    const pricing = await this.pricingService.getEBSPricing(config.type, region);
    const hourlyCost = (pricing.pricePerGBMonth * config.size) / 730;

    return {
      hourly: hourlyCost,
      breakdown: { storage: hourlyCost },
      details: { size: config.size, type: config.type, region }
    };
  }

  async calculateElastiCacheCost(resource, region) {
    const config = resource.config;
    const nodeType = config.node_type;
    const numNodes = config.num_cache_nodes || config.num_cache_clusters || 1;

    const pricing = await this.pricingService.getElastiCachePricing(nodeType, region);
    const hourlyCost = pricing.pricePerHour * numNodes;

    return {
      hourly: hourlyCost,
      breakdown: { compute: hourlyCost },
      details: { nodeType, numNodes, region }
    };
  }

  async calculateLoadBalancerCost(resource, region) {
    const config = resource.config;
    const lbType = config.load_balancer_type || 'application';
    const pricing = await this.pricingService.getLoadBalancerPricing(lbType, region);

    const hourlyCost = pricing.pricePerHour + (pricing.pricePerLCU || 0);

    return {
      hourly: hourlyCost,
      breakdown: { base: pricing.pricePerHour, lcu: pricing.pricePerLCU || 0 },
      details: { type: lbType, region }
    };
  }

  async calculateNATGatewayCost(resource, region) {
    const pricing = await this.pricingService.getNATGatewayPricing(region);
    
    // Estimate 100GB/day data transfer
    const estimatedDataGBPerHour = 100 / 24;
    const dataCost = estimatedDataGBPerHour * pricing.dataProcessingPerGB;

    return {
      hourly: pricing.pricePerHour + dataCost,
      breakdown: { base: pricing.pricePerHour, data: dataCost },
      details: { region, note: 'Data transfer estimated at 100GB/day' }
    };
  }

  async calculateCloudWatchAlarmCost(resource, region) {
    const pricing = await this.pricingService.getCloudWatchAlarmPricing(region);
    const hourlyCost = pricing.pricePerAlarmMonth / 730;

    return {
      hourly: hourlyCost,
      breakdown: { alarm: hourlyCost },
      details: { region }
    };
  }

  async calculateLaunchTemplateCost(resource, region) {
    const config = resource.config;
    const pricing = await this.pricingService.getEC2Pricing(config.instance_type, region, 'Linux');

    return {
      hourly: pricing.pricePerHour,
      breakdown: { compute: pricing.pricePerHour },
      details: { instanceType: config.instance_type, region, note: 'Per instance cost' }
    };
  }

  async calculateAutoScalingGroupCost(resource, region) {
    const config = resource.config;
    const desiredCapacity = config.desired_capacity || 1;
    
    // Try to get instance type from launch template reference
    // This is simplified - in production you'd resolve the reference
    const instanceType = config.launch_template?.instance_type || 't3.small';
    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');

    return {
      hourly: pricing.pricePerHour * desiredCapacity,
      breakdown: { compute: pricing.pricePerHour * desiredCapacity },
      details: { instanceType, desiredCapacity, region }
    };
  }

  formatCostSummary(costBreakdown) {
    return {
      summary: {
        hourly: `$${costBreakdown.summary.hourly.toFixed(4)}`,
        daily: `$${costBreakdown.summary.daily.toFixed(2)}`,
        monthly: `$${costBreakdown.summary.monthly.toFixed(2)}`,
        yearly: `$${costBreakdown.summary.yearly.toFixed(2)}`
      },
      resourceCount: costBreakdown.resources.length,
      region: costBreakdown.region,
      currency: costBreakdown.currency,
      timestamp: costBreakdown.timestamp,
      errors: costBreakdown.errors
    };
  }
}