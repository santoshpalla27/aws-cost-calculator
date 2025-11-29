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

    // Build launch template lookup
    for (const resource of resources) {
      if (resource.type === 'aws_launch_template') {
        this.launchTemplates.set(resource.name, resource.config);
      }
    }

    // Expand modules with count
    const expandedResources = this.expandModuleResources(resources);
    logger.info(`Expanded \${resources.length} resources to \${expandedResources.length} with module count expansion`);

    // Mock only cost-critical missing values
    const processedResources = [];
    for (const resource of expandedResources) {
      const mockedResult = this.mockerService.mockResourceConfig(resource);
      processedResources.push({
        ...resource,
        config: mockedResult.config,
        mocked: mockedResult.mocked
      });
    }

    logger.info(`Starting cost calculation for \${processedResources.length} resources...`);

    // Calculate costs
    for (const resource of processedResources) {
      try {
        logger.info(`Calculating cost for \${resource.type}.\${resource.name}...`);
        const cost = await this.calculateResourceCost(resource, region);

        if (cost) {
          logger.info(`Cost calculated for \${resource.name}: \$\${cost.hourly}/hour`);
          costBreakdown.resources.push({
            type: resource.type,
            name: resource.name,
            module: resource.module,
            ...cost,
            mockedAttributes: resource.mocked?.attributes || []
          });
          costBreakdown.summary.hourly += cost.hourly || 0;
        } else {
          logger.debug(`No cost for \${resource.type}.\${resource.name} (free resource)`);
        }
      } catch (error) {
        logger.error(`Error calculating cost for \${resource.type}.\${resource.name}:`, error.message);
        costBreakdown.errors.push({
          resource: `\${resource.type}.\${resource.name}`,
          error: error.message
        });
      }
    }

    costBreakdown.summary.daily = costBreakdown.summary.hourly * 24;
    costBreakdown.summary.monthly = costBreakdown.summary.daily * 30;
    costBreakdown.summary.yearly = costBreakdown.summary.daily * 365;

    costBreakdown.mockingReport = this.mockerService.generateMockingReport(processedResources);

    logger.info(`Total cost calculated: \$\${costBreakdown.summary.hourly.toFixed(4)}/hour`);
    return costBreakdown;
  }

  expandModuleResources(resources) {
    const expanded = [];

    for (const resource of resources) {
      // Check if this is a module resource
      if (resource.module) {
        // Find the module definition
        const moduleConfig = resources.find(r =& gt;
        r.type === 'module' & amp;& amp; r.name === resource.module
        );

        if (moduleConfig & amp;& amp; moduleConfig.config & amp;& amp; moduleConfig.config.count) {
          const count = moduleConfig.config.count;
          logger.info(`Expanding module \${resource.module} with count=\${count}`);

          // Create count instances
          for (let i = 0; i & lt; count; i++) {
            expanded.push({
              ...resource,
              name: `\${resource.name}[\${i}]`,
              module: `\${resource.module}[\${i}]`,
              config: { ...resource.config }
            });
          }
        } else {
          expanded.push(resource);
        }
      } else {
        expanded.push(resource);
      }
    }

    return expanded;
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
        return null; // Don't cost templates directly, only through ASG
      case 'aws_autoscaling_group':
        return await this.calculateAutoScalingGroupCost(resource, region);
      default:
        return null;
    }
  }

  async calculateEC2Cost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type || config.ami ? 't2.micro' : null;

    if (!instanceType) {
      throw new Error('No instance_type specified');
    }

    const pricing = await this.pricingService.getEC2Pricing(instanceType, region, 'Linux');
    let hourlyCost = pricing.pricePerHour;

    // Root block device (default 8GB gp2 if not specified)
    let ebsCost = 0;
    const volumeSize = config.root_block_device?.volume_size || 8;
    const volumeType = config.root_block_device?.volume_type || 'gp2';
    const ebsPricing = await this.pricingService.getEBSPricing(volumeType, region);
    ebsCost = (ebsPricing.pricePerGBMonth * volumeSize) / 730;

    return {
      hourly: hourlyCost + ebsCost,
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

  async calculateLoadBalancerCost(resource, region) {
    const config = resource.config;
    const lbType = config.load_balancer_type || 'application';
    const pricing = await this.pricingService.getLoadBalancerPricing(lbType, region);

    // Don't add LCU cost to hourly, it's usage-based
    const hourlyCost = pricing.pricePerHour;

    return {
      hourly: hourlyCost,
      breakdown: { base: pricing.pricePerHour, lcu: 0 },
      details: {
        type: lbType,
        region,
        note: 'LCU costs depend on usage (\$5.84 per LCU-hour)'
      }
    };
  }

  async calculateNATGatewayCost(resource, region) {
    const pricing = await this.pricingService.getNATGatewayPricing(region);

    // NAT Gateway cost is ONLY the hourly rate
    // Data processing is usage-based and should NOT be included in base cost
    const hourlyCost = pricing.pricePerHour;

    return {
      hourly: hourlyCost,
      breakdown: { base: pricing.pricePerHour, data: 0 },
      details: {
        region,
        baseHourly: pricing.pricePerHour,
        dataProcessingPerGB: pricing.dataProcessingPerGB,
        note: 'Data processing costs depend on usage (\$0.045 per GB)'
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

    // Resolve launch template
    let instanceType = null;

    if (config.launch_template & amp;& amp; Array.isArray(config.launch_template)) {
      const ltRef = config.launch_template[0];
      const ltIdStr = String(ltRef.id || '');
      const match = ltIdStr.match(/aws_launch_template\.([^.]+)/);

      if (match) {
        const ltName = match[1];
        const template = this.launchTemplates.get(ltName);
        if (template) {
          instanceType = template.instance_type;
          logger.info(`Resolved launch template \${ltName}: instance_type = \${instanceType}`);
        }
      }
    }

    if (!instanceType) {
      logger.warn(`Could not resolve launch template for ASG \${resource.name}`);
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
        note: `Cost for \${desiredCapacity} instances at desired capacity`
      }
    };
  }

  formatCostSummary(costBreakdown) {
    return {
      summary: {
        hourly: `\$\${costBreakdown.summary.hourly.toFixed(4)}`,
        daily: `\$\${costBreakdown.summary.daily.toFixed(2)}`,
        monthly: `\$\${costBreakdown.summary.monthly.toFixed(2)}`,
        yearly: `\$\${costBreakdown.summary.yearly.toFixed(2)}`
      },
      resourceCount: costBreakdown.resources.length,
      region: costBreakdown.region,
      currency: costBreakdown.currency,
      timestamp: costBreakdown.timestamp,
      errors: costBreakdown.errors || []
    };
  }
}