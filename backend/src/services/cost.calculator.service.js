import logger from '../config/logger.config.js';

export class CostCalculatorService {
  constructor(pricingService, metadataService, mockerService) {
    this.pricingService = pricingService;
    this.metadataService = metadataService;
    this.mockerService = mockerService;
  }

  async calculateTotalCost(resources, region = 'us-east-1', timeframe = 'monthly') {
    const costBreakdown = {
      resources: [],
      summary: {
        hourly: 0,
        daily: 0,
        monthly: 0,
        yearly: 0
      },
      region,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      mockingReport: null
    };

    // Mock necessary values
    const processedResources = [];
    for (const resource of resources) {
      const mockedResult = this.mockerService.mockResourceConfig(resource);
      processedResources.push({
        ...resource,
        config: mockedResult.config,
        mocked: mockedResult.mocked
      });
    }

    // Calculate costs for each resource
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

          // Add to totals
          costBreakdown.summary.hourly += cost.hourly || 0;
        }
      } catch (error) {
        logger.error(`Error calculating cost for ${resource.type}.${resource.name}:`, error);
        costBreakdown.resources.push({
          type: resource.type,
          name: resource.name,
          error: error.message,
          cost: null
        });
      }
    }

    // Calculate time-based totals
    costBreakdown.summary.daily = costBreakdown.summary.hourly * 24;
    costBreakdown.summary.monthly = costBreakdown.summary.daily * 30;
    costBreakdown.summary.yearly = costBreakdown.summary.daily * 365;

    // Add mocking report
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
      
      case 'aws_s3_bucket':
        return await this.calculateS3Cost(resource, region);
      
      case 'aws_elasticache_cluster':
        return await this.calculateElastiCacheCost(resource, region);
      
      case 'aws_lb':
      case 'aws_alb':
      case 'aws_elb':
        return await this.calculateLoadBalancerCost(resource, region);
      
      case 'aws_nat_gateway':
        return await this.calculateNATGatewayCost(resource, region);
      
      default:
        logger.warn(`Cost calculation not implemented for ${resource.type}`);
        return null;
    }
  }

  async calculateEC2Cost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type;
    
    // Get pricing
    const pricing = await this.pricingService.getEC2Pricing(
      instanceType,
      region,
      this.getOSFromAMI(config.ami)
    );

    const hourlyCost = pricing.pricePerHour;

    // Calculate EBS costs if root_block_device specified
    let ebsCost = 0;
    if (config.root_block_device) {
      const volumeSize = config.root_block_device.volume_size || 8;
      const volumeType = config.root_block_device.volume_type || 'gp3';
      
      const ebsPricing = await this.pricingService.getEBSPricing(volumeType, region);
      ebsCost = (ebsPricing.pricePerGBMonth * volumeSize) / 730; // Convert to hourly
    }

    // Calculate additional EBS volumes
    if (config.ebs_block_device && Array.isArray(config.ebs_block_device)) {
      for (const device of config.ebs_block_device) {
        const volumeSize = device.volume_size || 10;
        const volumeType = device.volume_type || 'gp3';
        
        const ebsPricing = await this.pricingService.getEBSPricing(volumeType, region);
        ebsCost += (ebsPricing.pricePerGBMonth * volumeSize) / 730;
      }
    }

    return {
      hourly: hourlyCost + ebsCost,
      breakdown: {
        compute: hourlyCost,
        storage: ebsCost
      },
      details: {
        instanceType,
        region,
        pricing: pricing.isEstimate ? 'estimated' : 'actual'
      }
    };
  }

  async calculateRDSCost(resource, region) {
    const config = resource.config;
    const instanceClass = config.instance_class;
    const engine = config.engine;
    const allocatedStorage = config.allocated_storage || 20;
    const multiAZ = config.multi_az || false;

    // Get instance pricing
    const pricing = await this.pricingService.getRDSPricing(
      instanceClass,
      engine,
      region,
      multiAZ ? 'Multi-AZ' : 'Single-AZ'
    );

    let instanceCost = pricing.pricePerHour;

    // Multi-AZ doubles the instance cost
    if (multiAZ) {
      instanceCost *= 2;
    }

    // Calculate storage cost
    const storageType = config.storage_type || 'gp2';
    const storagePricing = await this.pricingService.getEBSPricing(storageType, region);
    const storageCost = (storagePricing.pricePerGBMonth * allocatedStorage) / 730;

    // IOPS cost if applicable
    let iopsCost = 0;
    if (config.iops && (storageType === 'io1' || storageType === 'io2')) {
      iopsCost = (config.iops * 0.10) / 730; // $0.10 per provisioned IOPS per month
    }

    return {
      hourly: instanceCost + storageCost + iopsCost,
      breakdown: {
        compute: instanceCost,
        storage: storageCost,
        iops: iopsCost
      },
      details: {
        instanceClass,
        engine,
        allocatedStorage,
        multiAZ,
        region,
        pricing: pricing.isEstimate ? 'estimated' : 'actual'
      }
    };
  }

  async calculateEBSCost(resource, region) {
    const config = resource.config;
    const size = config.size || 10;
    const type = config.type || 'gp3';

    const pricing = await this.pricingService.getEBSPricing(type, region);
    const monthlyCost = pricing.pricePerGBMonth * size;
    const hourlyCost = monthlyCost / 730;

    // Add IOPS cost for provisioned IOPS volumes
    let iopsCost = 0;
    if (config.iops && (type === 'io1' || type === 'io2')) {
      iopsCost = (config.iops * 0.10) / 730;
    }

    return {
      hourly: hourlyCost + iopsCost,
      breakdown: {
        storage: hourlyCost,
        iops: iopsCost
      },
      details: {
        size,
        type,
        region,
        pricing: pricing.isEstimate ? 'estimated' : 'actual'
      }
    };
  }

  async calculateS3Cost(resource, region) {
    const config = resource.config;
    
    // S3 cost depends on usage, we'll estimate based on typical usage
    const estimatedStorageGB = config.estimated_size_gb || 100; // User can provide estimate
    const storageClass = config.storage_class || 'STANDARD';

    const pricing = await this.pricingService.getS3Pricing(storageClass, region);
    const monthlyCost = pricing.pricePerGBMonth * estimatedStorageGB;
    const hourlyCost = monthlyCost / 730;

    // Add request costs (estimated)
    const estimatedRequests = config.estimated_requests_per_month || 10000;
    const requestCost = (estimatedRequests * 0.0004) / 730; // $0.0004 per 1000 PUT requests

    return {
      hourly: hourlyCost + requestCost,
      breakdown: {
        storage: hourlyCost,
        requests: requestCost
      },
      details: {
        estimatedStorageGB,
        storageClass,
        region,
        note: 'S3 costs are estimated based on typical usage patterns',
        pricing: pricing.isEstimate ? 'estimated' : 'actual'
      }
    };
  }

  async calculateElastiCacheCost(resource, region) {
    const config = resource.config;
    const nodeType = config.node_type || 'cache.t3.micro';
    const numNodes = config.num_cache_nodes || 1;

    // ElastiCache pricing is similar to EC2
    const pricing = await this.pricingService.getEC2Pricing(
      nodeType.replace('cache.', ''),
      region
    );

    const hourlyCost = pricing.pricePerHour * numNodes;

    return {
      hourly: hourlyCost,
      breakdown: {
        compute: hourlyCost
      },
      details: {
        nodeType,
        numNodes,
        region
      }
    };
  }

  async calculateLoadBalancerCost(resource, region) {
    // ALB/NLB pricing: ~$0.0225 per hour + $0.008 per LCU-hour
    const baseHourlyCost = 0.0225;
    const lcuCost = 0.008; // Assuming 1 LCU for estimation

    return {
      hourly: baseHourlyCost + lcuCost,
      breakdown: {
        base: baseHourlyCost,
        lcu: lcuCost
      },
      details: {
        type: resource.type,
        region,
        note: 'LCU costs estimated based on typical usage'
      }
    };
  }

  async calculateNATGatewayCost(resource, region) {
    // NAT Gateway: ~$0.045 per hour + $0.045 per GB processed
    const baseHourlyCost = 0.045;
    const estimatedDataGB = 100; // per hour
    const dataCost = estimatedDataGB * 0.045;

    return {
      hourly: baseHourlyCost + dataCost,
      breakdown: {
        base: baseHourlyCost,
        data: dataCost
      },
      details: {
        region,
        estimatedDataGB,
        note: 'Data transfer costs estimated based on typical usage'
      }
    };
  }

  getOSFromAMI(ami) {
    // Simple heuristic to determine OS from AMI
    // In production, you'd look this up from AWS
    if (!ami) return 'Linux';
    
    const amiLower = ami.toLowerCase();
    if (amiLower.includes('windows')) return 'Windows';
    if (amiLower.includes('rhel')) return 'RHEL';
    if (amiLower.includes('suse')) return 'SUSE';
    
    return 'Linux';
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
      timestamp: costBreakdown.timestamp
    };
  }
}