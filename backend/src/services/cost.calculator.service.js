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

    logger.info(`Starting cost calculation for ${processedResources.length} resources...`);

    // Calculate costs
    for (const resource of processedResources) {
      try {
        logger.info(`Calculating cost for ${resource.type}.${resource.name}...`);
        const cost = await this.calculateResourceCost(resource, region);
        
        if (cost) {
          logger.info(`Cost calculated for ${resource.name}: $${cost.hourly}/hour`);
          costBreakdown.resources.push({
            type: resource.type,
            name: resource.name,
            module: resource.module,
            ...cost,
            mockedAttributes: resource.mocked?.attributes || []
          });
          costBreakdown.summary.hourly += cost.hourly || 0;
        } else {
          logger.info(`No cost calculated for ${resource.type}.${resource.name} (may be free resource)`);
        }
      } catch (error) {
        logger.error(`Error calculating cost for ${resource.type}.${resource.name}:`, error.message);
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

    logger.info(`Total cost calculated: $${costBreakdown.summary.hourly}/hour`);
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
        logger.debug(`No cost calculation for ${resource.type} (may be free)`);
        return null;
    }
  }

  async calculateEC2Cost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type;
    
    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');
    let hourlyCost = pricing.pricePerHour;

    // EBS root volume
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
      details: { instanceClass: config.instance_class, engine: config.engine, allocatedStorage, region }
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
    
    let numNodes = 1;
    if (resource.type === 'aws_elasticache_replication_group') {
      const clusters = config.num_cache_clusters || config.number_cache_clusters || 2;
      const replicas = config.replicas_per_node_group || 1;
      numNodes = clusters * replicas;
    } else {
      numNodes = config.num_cache_nodes || 1;
    }

    const pricing = await this.pricingService.getElastiCachePricing(nodeType, 'Redis', region);
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

    const hourlyCost = pricing.pricePerHour + pricing.pricePerLCU;

    return {
      hourly: hourlyCost,
      breakdown: { base: pricing.pricePerHour, lcu: pricing.pricePerLCU },
      details: { type: lbType, region, note: 'Includes 1 LCU estimate' }
    };
  }

  async calculateNATGatewayCost(resource, region) {
    const pricing = await this.pricingService.getNATGatewayPricing(region);
    
    // Estimate 100GB/day = 4.17 GB/hour
    const estimatedDataGBPerHour = 100 / 24;
    const dataCost = estimatedDataGBPerHour * pricing.dataProcessingPerGB;

    return {
      hourly: pricing.pricePerHour + dataCost,
      breakdown: { base: pricing.pricePerHour, data: dataCost },
      details: { 
        region, 
        baseHourly: pricing.pricePerHour,
        dataProcessingPerGB: pricing.dataProcessingPerGB,
        estimatedDataGBPerDay: 100,
        note: 'Data processing estimated at 100GB/day'
      }
    };
  }

  async calculateCloudWatchAlarmCost(resource, region) {
    const pricing = await this.pricingService.getCloudWatchAlarmPricing(region);
    const hourlyCost = pricing.pricePerAlarmMonth / 730;

    return {
      hourly: hourlyCost,
      breakdown: { alarm: hourlyCost },
      details: { region, monthlyPrice: pricing.pricePerAlarmMonth }
    };
  }

  async calculateLaunchTemplateCost(resource, region) {
    const config = resource.config;
    
    if (!config.instance_type) {
      logger.warn(`Launch template ${resource.name} has no instance_type`);
      return null;
    }

    const pricing = await this.pricingService.getEC2Pricing(config.instance_type, region, 'Linux');

    return {
      hourly: pricing.pricePerHour,
      breakdown: { compute: pricing.pricePerHour },
      details: { instanceType: config.instance_type, region, note: 'Per instance if launched' }
    };
  }

  async calculateAutoScalingGroupCost(resource, region) {
    const config = resource.config;
    const desiredCapacity = config.desired_capacity || 1;
    
    // Use resolved launch template if available
    let instanceType = null;
    
    if (config._resolved_launch_template) {
      instanceType = config._resolved_launch_template.instance_type;
      logger.info(`Using resolved instance type for ASG ${resource.name}: ${instanceType}`);
    } else {
      // Fallback or attempt to use mocked value
      if (config.launch_template && Array.isArray(config.launch_template)) {
         // Try to guess from structure if not resolved but this is risky
      }
      // Default/Mock fallback logic can be here if desired, 
      // but per instruction we return null or use a default if not found.
      // The provided code had a fallback in the main block, but the update block 
      // had a specific logic. I will use the UPDATE logic as requested in "4. Update ASG Calculator to Use Resolved Template"
      // which returns null if not resolved.
      logger.warn(`Could not resolve launch template for ASG ${resource.name}`);
      return null;
    }
  
    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');
    const hourlyCost = pricing.pricePerHour * desiredCapacity;
  
    return {
      hourly: hourlyCost,
      breakdown: { compute: hourlyCost },
      details: { 
        instanceType, 
        desiredCapacity,
        minSize: config.min_size,
        maxSize: config.max_size,
        region,
        note: `Cost for ${desiredCapacity} instances at desired capacity`
      }
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
      errors: costBreakdown.errors || []
    };
  }
}