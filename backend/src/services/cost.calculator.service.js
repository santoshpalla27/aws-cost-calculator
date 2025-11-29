import logger from '../config/logger.config.js';

export class CostCalculatorService {
  constructor(pricingService, metadataService, mockerService) {
    this.pricingService = pricingService;
    this.metadataService = metadataService;
    this.mockerService = mockerService;
    this.launchTemplates = new Map();
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

    for (const resource of resources) {
      if (resource.type === 'aws_launch_template') {
        this.launchTemplates.set(resource.name, resource.config);
        logger.info('Registered launch template: ' + resource.name + ' with instance_type: ' + resource.config.instance_type);
      }
    }

    logger.info('Found ' + this.launchTemplates.size + ' launch templates');

    const processedResources = [];
    for (const resource of resources) {
      const mockedResult = this.mockerService.mockResourceConfig(resource);
      processedResources.push({
        ...resource,
        config: mockedResult.config,
        mocked: mockedResult.mocked
      });
    }

    logger.info('Starting cost calculation for ' + processedResources.length + ' resources...');

    for (const resource of processedResources) {
      try {
        logger.info('Calculating cost for ' + resource.type + '.' + resource.name + '...');
        const cost = await this.calculateResourceCost(resource, region);

        if (cost) {
          logger.info('Cost calculated for ' + resource.name + ': \$' + cost.hourly + '/hour (\$' + (cost.hourly * 730).toFixed(2) + '/month)');
          costBreakdown.resources.push({
            type: resource.type,
            name: resource.name,
            module: resource.module,
            ...cost,
            mockedAttributes: resource.mocked?.attributes || []
          });
          costBreakdown.summary.hourly += cost.hourly || 0;
        } else {
          logger.debug('No cost for ' + resource.type + '.' + resource.name + ' (free resource)');
        }
      } catch (error) {
        logger.error('Error calculating cost for ' + resource.type + '.' + resource.name + ':', error.message);
        costBreakdown.errors.push({
          resource: resource.type + '.' + resource.name,
          error: error.message
        });
      }
    }

    costBreakdown.summary.daily = costBreakdown.summary.hourly * 24;
    costBreakdown.summary.monthly = costBreakdown.summary.hourly * 730;
    costBreakdown.summary.yearly = costBreakdown.summary.hourly * 8760;

    costBreakdown.mockingReport = this.mockerService.generateMockingReport(processedResources);

    logger.info('Total cost calculated: \$' + costBreakdown.summary.hourly.toFixed(4) + '/hour (\$' + costBreakdown.summary.monthly.toFixed(2) + '/month)');
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
        return null;
      case 'aws_autoscaling_group':
        return await this.calculateAutoScalingGroupCost(resource, region);
      default:
        return null;
    }
  }

  async calculateEC2Cost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type || 't2.micro';

    if (!instanceType) {
      throw new Error('No instance_type specified');
    }

    logger.info('Fetching EC2 pricing for ' + instanceType + '...');
    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');
    let hourlyCost = pricing.pricePerHour;

    let ebsCost = 0;
    const volumeSize = config.root_block_device?.volume_size || 8;
    const volumeType = config.root_block_device?.volume_type || 'gp2';
    
    logger.info('Fetching EBS pricing for ' + volumeType + '...');
    const ebsPricing = await this.pricingService.getEBSPricing(volumeType, region);
    ebsCost = (ebsPricing.pricePerGBMonth * volumeSize) / 730;

    const totalHourly = hourlyCost + ebsCost;
    logger.info('EC2 ' + instanceType + ': compute=\$' + hourlyCost + '/hr, storage=\$' + ebsCost + '/hr, total=\$' + totalHourly + '/hr');

    return {
      hourly: totalHourly,
      breakdown: { compute: hourlyCost, storage: ebsCost },
      details: { instanceType, volumeSize, volumeType, region }
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
    const volumeType = config.type || 'gp2';
    const size = config.size || 10;
    
    const pricing = await this.pricingService.getEBSPricing(volumeType, region);
    const hourlyCost = (pricing.pricePerGBMonth * size) / 730;
    
    return {
      hourly: hourlyCost,
      breakdown: { storage: hourlyCost },
      details: { volumeType, size, region }
    };
  }

  async calculateElastiCacheCost(resource, region) {
    const config = resource.config;
    const nodeType = config.node_type || 'cache.t3.micro';
    const engine = resource.type === 'aws_elasticache_replication_group' ? 'Redis' : 'Memcached';
    const numNodes = config.num_cache_nodes || config.number_cache_clusters || 1;
    
    const pricing = await this.pricingService.getElastiCachePricing(nodeType, engine, region);
    const hourlyCost = pricing.pricePerHour * numNodes;
    
    return {
      hourly: hourlyCost,
      breakdown: { compute: hourlyCost },
      details: { nodeType, engine, numNodes, region }
    };
  }

  async calculateLoadBalancerCost(resource, region) {
    const config = resource.config;
    const lbType = config.load_balancer_type || 'application';
    const pricing = await this.pricingService.getLoadBalancerPricing(lbType, region);

    const hourlyCost = pricing.pricePerHour;

    return {
      hourly: hourlyCost,
      breakdown: { base: pricing.pricePerHour, lcu: 0 },
      details: {
        type: lbType,
        region,
        note: 'LCU costs depend on usage (\$' + pricing.pricePerLCU + '/LCU-hour)'
      }
    };
  }

  async calculateNATGatewayCost(resource, region) {
    const pricing = await this.pricingService.getNATGatewayPricing(region);
    const hourlyCost = pricing.pricePerHour;

    logger.info('NAT Gateway: \$' + hourlyCost + '/hr (data processing: \$' + pricing.dataProcessingPerGB + '/GB)');

    return {
      hourly: hourlyCost,
      breakdown: { base: pricing.pricePerHour, data: 0 },
      details: {
        region,
        baseHourly: pricing.pricePerHour,
        dataProcessingPerGB: pricing.dataProcessingPerGB,
        note: 'Data processing costs depend on usage (\$' + pricing.dataProcessingPerGB + '/GB)'
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

  async calculateAutoScalingGroupCost(resource, region) {
    const config = resource.config;
    const desiredCapacity = config.desired_capacity || 1;

    let instanceType = null;

    if (config._resolved_launch_template && config._resolved_launch_template.instance_type) {
      instanceType = config._resolved_launch_template.instance_type;
      logger.info('ASG ' + resource.name + ': Found instance_type from _resolved_launch_template: ' + instanceType);
    }

    if (!instanceType && config.launch_template && Array.isArray(config.launch_template)) {
      const ltRef = config.launch_template[0];
      const ltIdStr = String(ltRef.id || '');
      const match = ltIdStr.match(/aws_launch_template\.([^.]+)/);

      if (match) {
        const ltName = match[1];
        logger.info('ASG ' + resource.name + ': Looking for launch template: ' + ltName);
        const template = this.launchTemplates.get(ltName);
        if (template && template.instance_type) {
          instanceType = template.instance_type;
          logger.info('ASG ' + resource.name + ': Found instance_type from launch template map: ' + instanceType);
        } else {
          logger.warn('ASG ' + resource.name + ': Launch template ' + ltName + ' not found or missing instance_type');
        }
      }
    }

    if (!instanceType) {
      logger.warn('Could not resolve instance type for ASG ' + resource.name + ', using t2.micro as fallback');
      instanceType = 't2.micro';
    }

    logger.info('Calculating ASG cost for ' + desiredCapacity + 'x ' + instanceType);
    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');
    
    const ebsPricing = await this.pricingService.getEBSPricing('gp2', region);
    const ebsCostPerInstance = (ebsPricing.pricePerGBMonth * 8) / 730;
    
    const computeCost = pricing.pricePerHour * desiredCapacity;
    const storageCost = ebsCostPerInstance * desiredCapacity;
    const totalHourly = computeCost + storageCost;

    logger.info('ASG ' + resource.name + ': compute=\$' + computeCost + '/hr, storage=\$' + storageCost + '/hr, total=\$' + totalHourly + '/hr');

    return {
      hourly: totalHourly,
      breakdown: { 
        compute: computeCost,
        storage: storageCost
      },
      details: {
        instanceType,
        desiredCapacity,
        minSize: config.min_size,
        maxSize: config.max_size,
        region,
        note: 'Cost for ' + desiredCapacity + ' instances (' + instanceType + ') at desired capacity'
      }
    };
  }

  formatCostSummary(costBreakdown) {
    return {
      summary: {
        hourly: '\$' + costBreakdown.summary.hourly.toFixed(4),
        daily: '\$' + costBreakdown.summary.daily.toFixed(2),
        monthly: '\$' + costBreakdown.summary.monthly.toFixed(2),
        yearly: '\$' + costBreakdown.summary.yearly.toFixed(2)
      },
      resourceCount: costBreakdown.resources.length,
      region: costBreakdown.region,
      currency: costBreakdown.currency,
      timestamp: costBreakdown.timestamp,
      errors: costBreakdown.errors || []
    };
  }
}