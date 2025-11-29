import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class EC2PricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'EC2');
  }

  getServiceCode() {
    return 'AmazonEC2';
  }

  getSupportedResourceTypes() {
    return [
      'aws_instance',
      'aws_spot_instance_request',
      'aws_spot_fleet_request',
      'aws_ec2_fleet',
      'aws_launch_template',
      'aws_launch_configuration',
      'aws_autoscaling_group',
      'aws_ebs_volume',
      'aws_ebs_snapshot',
      'aws_ebs_snapshot_copy',
      'aws_ami',
      'aws_ami_copy',
      'aws_ec2_capacity_reservation',
      'aws_placement_group'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_instance':
        return this.calculateInstanceCost(resource, region);
      case 'aws_spot_instance_request':
        return this.calculateSpotInstanceCost(resource, region);
      case 'aws_autoscaling_group':
        return this.calculateASGCost(resource, region);
      case 'aws_ebs_volume':
        return this.calculateEBSVolumeCost(resource, region);
      case 'aws_ebs_snapshot':
      case 'aws_ebs_snapshot_copy':
        return this.calculateSnapshotCost(resource, region);
      case 'aws_launch_template':
      case 'aws_launch_configuration':
        return null; // No direct cost, cost comes from instances
      default:
        return null;
    }
  }

  async calculateInstanceCost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type || 't3.micro';
    const tenancy = config.tenancy || 'default';
    
    // Get compute cost
    const computeCost = await this.getInstancePricing(instanceType, region, tenancy);
    
    // Get root block device cost
    const rootBlockCost = await this.calculateRootBlockDeviceCost(config, region);
    
    // Get additional EBS volumes cost
    const ebsBlocksCost = await this.calculateAdditionalEBSCost(config, region);
    
    // Get data transfer estimate (if specified)
    const dataTransferCost = this.estimateDataTransferCost(config);
    
    // EIP cost (if using)
    const eipCost = config.associate_public_ip_address ? 0 : 0; // EIPs are free when attached
    
    // Detailed Monitoring cost
    const monitoringCost = config.monitoring ? this.monthlyToHourly(2.10) : 0; // $2.10/month per instance
    
    const totalHourly = computeCost + rootBlockCost + ebsBlocksCost + dataTransferCost + monitoringCost;

    return this.formatCostResponse(totalHourly, {
      compute: computeCost,
      rootStorage: rootBlockCost,
      additionalStorage: ebsBlocksCost,
      dataTransfer: dataTransferCost,
      monitoring: monitoringCost
    }, {
      instanceType,
      tenancy,
      region,
      rootBlockDevice: config.root_block_device,
      detailedMonitoring: !!config.monitoring
    });
  }

  async calculateSpotInstanceCost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type || 't3.micro';
    
    // Spot instances typically 60-90% cheaper than on-demand
    // Using 70% discount as estimate
    const onDemandCost = await this.getInstancePricing(instanceType, region);
    const spotCost = onDemandCost * 0.3;
    
    const rootBlockCost = await this.calculateRootBlockDeviceCost(config, region);
    const totalHourly = spotCost + rootBlockCost;

    return this.formatCostResponse(totalHourly, {
      compute: spotCost,
      storage: rootBlockCost
    }, {
      instanceType,
      pricingModel: 'spot',
      estimatedDiscount: '70%',
      note: 'Spot prices vary based on demand. This is an estimate.'
    });
  }

  async calculateASGCost(resource, region) {
    const config = resource.config;
    const desiredCapacity = config.desired_capacity || config.min_size || 1;
    
    // Get instance type from launch template or launch configuration
    let instanceType = 't3.micro';
    
    if (config._resolved_launch_template?.instance_type) {
      instanceType = config._resolved_launch_template.instance_type;
    } else if (config.launch_configuration) {
      // Would need to resolve launch configuration
      instanceType = config.launch_configuration.instance_type || 't3.micro';
    } else if (config.mixed_instances_policy) {
      // Handle mixed instances policy
      const override = config.mixed_instances_policy[0]?.launch_template?.[0]?.override?.[0];
      if (override?.instance_type) {
        instanceType = override.instance_type;
      }
    }

    const instanceCost = await this.getInstancePricing(instanceType, region);
    const ebsCost = await this.getEBSPricing('gp3', region);
    const storagePerInstance = (ebsCost * 8) / 730; // 8GB default
    
    const totalHourly = (instanceCost + storagePerInstance) * desiredCapacity;

    return this.formatCostResponse(totalHourly, {
      compute: instanceCost * desiredCapacity,
      storage: storagePerInstance * desiredCapacity
    }, {
      instanceType,
      desiredCapacity,
      minSize: config.min_size,
      maxSize: config.max_size,
      note: `Cost calculated for ${desiredCapacity} instances at desired capacity`
    });
  }

  async calculateEBSVolumeCost(resource, region) {
    const config = resource.config;
    const volumeType = config.type || 'gp3';
    const size = config.size || 8;
    const iops = config.iops;
    const throughput = config.throughput;
    
    let monthlyCost = 0;
    
    // Base storage cost
    const storagePricing = await this.getEBSPricing(volumeType, region);
    monthlyCost += storagePricing * size;
    
    // IOPS cost (for io1, io2, gp3)
    if (iops && ['io1', 'io2', 'gp3'].includes(volumeType)) {
      const iopsPricing = await this.getEBSIOPSPricing(volumeType, region);
      if (volumeType === 'gp3' && iops > 3000) {
        monthlyCost += iopsPricing * (iops - 3000); // First 3000 IOPS free for gp3
      } else if (['io1', 'io2'].includes(volumeType)) {
        monthlyCost += iopsPricing * iops;
      }
    }
    
    // Throughput cost (for gp3)
    if (throughput && volumeType === 'gp3' && throughput > 125) {
      const throughputPricing = await this.getEBSThroughputPricing(region);
      monthlyCost += throughputPricing * (throughput - 125); // First 125 MB/s free
    }
    
    // Snapshot cost estimate (if snapshots enabled)
    if (config.snapshot_id) {
      // Existing snapshot, no additional cost for the volume itself
    }

    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: this.monthlyToHourly(storagePricing * size),
      iops: iops ? this.monthlyToHourly((iops - (volumeType === 'gp3' ? 3000 : 0)) * (await this.getEBSIOPSPricing(volumeType, region))) : 0,
      throughput: throughput && volumeType === 'gp3' ? this.monthlyToHourly((throughput - 125) * (await this.getEBSThroughputPricing(region))) : 0
    }, {
      volumeType,
      size,
      iops,
      throughput,
      region
    });
  }

  async calculateSnapshotCost(resource, region) {
    const config = resource.config;
    // Snapshots are charged per GB-month of data stored
    // Estimate based on volume size if available
    const estimatedSize = config.volume_size || 8;
    const snapshotPricePerGB = 0.05; // $0.05 per GB-month
    
    const monthlyCost = estimatedSize * snapshotPricePerGB;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: hourly
    }, {
      estimatedSize,
      note: 'Snapshot costs depend on actual data stored, not provisioned size'
    });
  }

  async calculateRootBlockDeviceCost(config, region) {
    const rootDevice = config.root_block_device?.[0] || config.root_block_device || {};
    const volumeType = rootDevice.volume_type || 'gp2';
    const volumeSize = rootDevice.volume_size || 8;
    
    const pricing = await this.getEBSPricing(volumeType, region);
    return this.monthlyToHourly(pricing * volumeSize);
  }

  async calculateAdditionalEBSCost(config, region) {
    if (!config.ebs_block_device) return 0;
    
    const ebsDevices = Array.isArray(config.ebs_block_device) 
      ? config.ebs_block_device 
      : [config.ebs_block_device];
    
    let totalMonthly = 0;
    
    for (const device of ebsDevices) {
      const volumeType = device.volume_type || 'gp2';
      const volumeSize = device.volume_size || 8;
      const pricing = await this.getEBSPricing(volumeType, region);
      totalMonthly += pricing * volumeSize;
    }
    
    return this.monthlyToHourly(totalMonthly);
  }

  estimateDataTransferCost(config) {
    // Data transfer costs are usage-based
    // Return 0 as we can't estimate without usage data
    return 0;
  }

  async getInstancePricing(instanceType, region, tenancy = 'default') {
    const cacheKey = `ec2-${instanceType}-${region}-${tenancy}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const filters = [
      { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceType },
      { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
      { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
      { Type: 'TERM_MATCH', Field: 'tenancy', Value: tenancy === 'default' ? 'Shared' : tenancy },
      { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
      { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
    ];

    try {
      const priceList = await this.fetchPricing(filters);
      const prices = this.parsePriceFromResponse(priceList);
      
      if (prices && prices.length > 0) {
        const hourlyPrice = prices[0].price;
        this.setCache(cacheKey, hourlyPrice);
        logger.info(`EC2 ${instanceType} pricing: $${hourlyPrice}/hour`);
        return hourlyPrice;
      }
      
      throw new Error(`No pricing found for ${instanceType}`);
    } catch (error) {
      logger.error(`Failed to get EC2 pricing for ${instanceType}:`, error);
      // Return fallback pricing
      return this.getFallbackInstancePricing(instanceType);
    }
  }

  async getEBSPricing(volumeType, region) {
    const cacheKey = `ebs-${volumeType}-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const filters = [
      { Type: 'TERM_MATCH', Field: 'volumeApiName', Value: volumeType },
      { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) }
    ];

    try {
      const priceList = await this.fetchPricing(filters);
      const prices = this.parsePriceFromResponse(priceList);
      
      if (prices && prices.length > 0) {
        const pricePerGB = prices[0].price;
        this.setCache(cacheKey, pricePerGB);
        return pricePerGB;
      }
      
      // Fallback pricing
      return this.getFallbackEBSPricing(volumeType);
    } catch (error) {
      logger.error(`Failed to get EBS pricing for ${volumeType}:`, error);
      return this.getFallbackEBSPricing(volumeType);
    }
  }

  async getEBSIOPSPricing(volumeType, region) {
    const fallbackPricing = {
      'io1': 0.065,
      'io2': 0.065,
      'gp3': 0.005
    };
    return fallbackPricing[volumeType] || 0;
  }

  async getEBSThroughputPricing(region) {
    return 0.04; // $0.04 per MB/s-month above 125 MB/s for gp3
  }

  getFallbackInstancePricing(instanceType) {
    // Fallback pricing for common instance types
    const fallback = {
      't2.micro': 0.0116,
      't2.small': 0.023,
      't2.medium': 0.0464,
      't3.micro': 0.0104,
      't3.small': 0.0208,
      't3.medium': 0.0416,
      't3.large': 0.0832,
      'm5.large': 0.096,
      'm5.xlarge': 0.192,
      'c5.large': 0.085,
      'c5.xlarge': 0.17,
      'r5.large': 0.126,
      'r5.xlarge': 0.252
    };
    return fallback[instanceType] || 0.0416; // Default to t3.medium
  }

  getFallbackEBSPricing(volumeType) {
    const fallback = {
      'gp2': 0.10,
      'gp3': 0.08,
      'io1': 0.125,
      'io2': 0.125,
      'st1': 0.045,
      'sc1': 0.025,
      'standard': 0.05
    };
    return fallback[volumeType] || 0.10;
  }
}