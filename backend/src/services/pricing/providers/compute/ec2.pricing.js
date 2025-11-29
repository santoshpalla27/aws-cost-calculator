import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class EC2PricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'EC2');
    this.initializeFallbackPricing();
  }

  initializeFallbackPricing() {
    // Fallback pricing for when AWS API fails
    this.fallbackPricing.set('t2.micro', 0.0116);
    this.fallbackPricing.set('t2.small', 0.023);
    this.fallbackPricing.set('t2.medium', 0.0464);
    this.fallbackPricing.set('t3.micro', 0.0104);
    this.fallbackPricing.set('t3.small', 0.0208);
    this.fallbackPricing.set('t3.medium', 0.0416);
    this.fallbackPricing.set('t3.large', 0.0832);
    this.fallbackPricing.set('t3.xlarge', 0.1664);
    this.fallbackPricing.set('m5.large', 0.096);
    this.fallbackPricing.set('m5.xlarge', 0.192);
    this.fallbackPricing.set('m5.2xlarge', 0.384);
    this.fallbackPricing.set('c5.large', 0.085);
    this.fallbackPricing.set('c5.xlarge', 0.17);
    this.fallbackPricing.set('c7i-flex.large', 0.08479);
    this.fallbackPricing.set('r5.large', 0.126);
    this.fallbackPricing.set('r5.xlarge', 0.252);
    
    // EBS fallback pricing (per GB-month)
    this.fallbackPricing.set('ebs-gp2', 0.10);
    this.fallbackPricing.set('ebs-gp3', 0.08);
    this.fallbackPricing.set('ebs-io1', 0.125);
    this.fallbackPricing.set('ebs-io2', 0.125);
    this.fallbackPricing.set('ebs-st1', 0.045);
    this.fallbackPricing.set('ebs-sc1', 0.025);
    this.fallbackPricing.set('ebs-standard', 0.05);
  }

  getServiceCode() {
    return 'AmazonEC2';
  }

  getSupportedResourceTypes() {
    return [
      'aws_instance',
      'aws_spot_instance_request',
      'aws_autoscaling_group',
      'aws_launch_template',
      'aws_launch_configuration',
      'aws_ebs_volume',
      'aws_ebs_snapshot'
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
        return this.calculateSnapshotCost(resource, region);
      case 'aws_launch_template':
      case 'aws_launch_configuration':
        return null; // No direct cost
      default:
        return null;
    }
  }

  async calculateInstanceCost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type || 't3.micro';
    
    logger.info(`Calculating EC2 cost for ${instanceType}...`);

    // Fetch REAL EC2 pricing from AWS API
    const computeCost = await this.getEC2Pricing(instanceType, region);
    
    // Fetch REAL EBS pricing for root volume
    const rootBlockCost = await this.calculateRootBlockDeviceCost(config, region);
    
    // Calculate additional EBS volumes
    const ebsBlocksCost = await this.calculateAdditionalEBSCost(config, region);
    
    // Detailed monitoring cost
    const monitoringCost = config.monitoring ? this.monthlyToHourly(2.10) : 0;
    
    const totalHourly = computeCost + rootBlockCost + ebsBlocksCost + monitoringCost;

    logger.info(`EC2 ${instanceType}: compute=$${computeCost}/hr, storage=$${rootBlockCost + ebsBlocksCost}/hr, total=$${totalHourly}/hr`);

    return this.formatCostResponse(totalHourly, {
      compute: computeCost,
      rootStorage: rootBlockCost,
      additionalStorage: ebsBlocksCost,
      monitoring: monitoringCost
    }, {
      instanceType,
      region,
      rootBlockDevice: config.root_block_device,
      detailedMonitoring: !!config.monitoring
    });
  }

  async calculateASGCost(resource, region) {
    const config = resource.config;
    const desiredCapacity = config.desired_capacity || config.min_size || 1;
    
    // Get instance type from resolved launch template
    let instanceType = 't3.micro';
    
    if (config._resolved_launch_template?.instance_type) {
      instanceType = config._resolved_launch_template.instance_type;
      logger.info(`ASG ${resource.name}: Using instance_type from launch template: ${instanceType}`);
    }

    // Fetch REAL pricing
    const instanceCost = await this.getEC2Pricing(instanceType, region);
    const ebsCost = await this.getEBSPricing('gp2', region);
    const storagePerInstance = this.monthlyToHourly(ebsCost * 8); // 8GB default
    
    const totalHourly = (instanceCost + storagePerInstance) * desiredCapacity;

    logger.info(`ASG ${resource.name}: ${desiredCapacity}x ${instanceType} = $${totalHourly}/hr`);

    return this.formatCostResponse(totalHourly, {
      compute: instanceCost * desiredCapacity,
      storage: storagePerInstance * desiredCapacity
    }, {
      instanceType,
      desiredCapacity,
      minSize: config.min_size,
      maxSize: config.max_size,
      region
    });
  }

  async calculateSpotInstanceCost(resource, region) {
    const config = resource.config;
    const instanceType = config.instance_type || 't3.micro';
    
    // Spot instances are ~70% cheaper than on-demand
    const onDemandCost = await this.getEC2Pricing(instanceType, region);
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
      note: 'Spot prices vary. This is an estimate.'
    });
  }

  async calculateEBSVolumeCost(resource, region) {
    const config = resource.config;
    const volumeType = config.type || 'gp3';
    const size = config.size || 8;
    const iops = config.iops;
    const throughput = config.throughput;
    
    // Fetch REAL EBS pricing
    const storagePricing = await this.getEBSPricing(volumeType, region);
    let monthlyCost = storagePricing * size;
    
    // IOPS cost for provisioned IOPS volumes
    if (iops && ['io1', 'io2', 'gp3'].includes(volumeType)) {
      const iopsPricing = await this.getEBSIOPSPricing(volumeType, region);
      if (volumeType === 'gp3' && iops > 3000) {
        monthlyCost += iopsPricing * (iops - 3000);
      } else if (['io1', 'io2'].includes(volumeType)) {
        monthlyCost += iopsPricing * iops;
      }
    }
    
    // Throughput cost for gp3
    if (throughput && volumeType === 'gp3' && throughput > 125) {
      const throughputPricing = 0.04; // $0.04 per MB/s-month
      monthlyCost += throughputPricing * (throughput - 125);
    }
    
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: hourly
    }, {
      volumeType,
      size,
      iops,
      throughput
    });
  }

  async calculateSnapshotCost(resource, region) {
    const estimatedSize = resource.config.volume_size || 8;
    const snapshotPricePerGB = 0.05; // $0.05 per GB-month
    
    const monthlyCost = estimatedSize * snapshotPricePerGB;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: hourly
    }, {
      estimatedSize,
      note: 'Snapshot costs depend on actual changed data'
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

  /**
   * Fetch REAL EC2 pricing from AWS Pricing API
   */
  async getEC2Pricing(instanceType, region) {
    const cacheKey = `ec2-${instanceType}-${region}`;
    
    return this.getPricingWithFallback(
      cacheKey,
      async () => {
        const filters = [
          { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceType },
          { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
          { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: 'Linux' },
          { Type: 'TERM_MATCH', Field: 'tenancy', Value: 'Shared' },
          { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
          { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
        ];

        const priceList = await this.fetchPricing(filters);
        const prices = this.parsePriceFromResponse(priceList);
        
        if (prices && prices.length > 0) {
          logger.info(`EC2 pricing fetched: ${instanceType} = $${prices[0].price}/hour`);
          return prices[0].price;
        }
        return null;
      },
      instanceType
    );
  }

  /**
   * Fetch REAL EBS pricing from AWS Pricing API
   */
  async getEBSPricing(volumeType, region) {
    const cacheKey = `ebs-${volumeType}-${region}`;
    
    return this.getPricingWithFallback(
      cacheKey,
      async () => {
        const filters = [
          { Type: 'TERM_MATCH', Field: 'volumeApiName', Value: volumeType },
          { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) }
        ];

        const priceList = await this.fetchPricing(filters);
        const prices = this.parsePriceFromResponse(priceList);
        
        if (prices && prices.length > 0) {
          logger.info(`EBS pricing fetched: ${volumeType} = $${prices[0].price}/GB-month`);
          return prices[0].price;
        }
        return null;
      },
      `ebs-${volumeType}`
    );
  }

  async getEBSIOPSPricing(volumeType, region) {
    const pricing = {
      'io1': 0.065,
      'io2': 0.065,
      'gp3': 0.005
    };
    return pricing[volumeType] || 0;
  }
}