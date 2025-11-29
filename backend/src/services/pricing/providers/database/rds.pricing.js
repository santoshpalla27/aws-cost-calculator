import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class RDSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'RDS');
  }

  getServiceCode() {
    return 'AmazonRDS';
  }

  getSupportedResourceTypes() {
    return [
      'aws_db_instance',
      'aws_rds_cluster',
      'aws_rds_cluster_instance',
      'aws_db_snapshot',
      'aws_db_cluster_snapshot',
      'aws_db_proxy',
      'aws_db_parameter_group',
      'aws_db_subnet_group',
      'aws_db_option_group',
      'aws_rds_global_cluster'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_db_instance':
        return this.calculateInstanceCost(resource, region);
      case 'aws_rds_cluster':
        return this.calculateClusterCost(resource, region);
      case 'aws_rds_cluster_instance':
        return this.calculateClusterInstanceCost(resource, region);
      case 'aws_db_snapshot':
      case 'aws_db_cluster_snapshot':
        return this.calculateSnapshotCost(resource, region);
      case 'aws_db_proxy':
        return this.calculateProxyCost(resource, region);
      default:
        return null;
    }
  }

  async calculateInstanceCost(resource, region) {
    const config = resource.config;
    const instanceClass = config.instance_class || 'db.t3.micro';
    const engine = config.engine || 'mysql';
    const multiAZ = config.multi_az || false;
    const allocatedStorage = config.allocated_storage || 20;
    const storageType = config.storage_type || 'gp2';
    const iops = config.iops;
    
    // Instance pricing
    let instancePricing = await this.getInstancePricing(instanceClass, engine, region);
    if (multiAZ) {
      instancePricing *= 2;
    }
    
    // Storage pricing
    let storagePricing = await this.getStoragePricing(storageType, region);
    let storageCost = this.monthlyToHourly(allocatedStorage * storagePricing);
    
    // IOPS pricing for io1
    let iopsCost = 0;
    if (storageType === 'io1' && iops) {
      const iopsPricing = 0.10; // $0.10 per IOPS-month
      iopsCost = this.monthlyToHourly(iops * iopsPricing);
    }
    
    // Backup storage (beyond allocated storage is free)
    const backupRetention = config.backup_retention_period || 7;
    let backupCost = 0;
    if (config._estimated_backup_storage_gb) {
      const extraBackupGB = Math.max(0, config._estimated_backup_storage_gb - allocatedStorage);
      backupCost = this.monthlyToHourly(extraBackupGB * 0.095);
    }
    
    // Performance Insights
    let piCost = 0;
    if (config.performance_insights_enabled) {
      const retentionDays = config.performance_insights_retention_period || 7;
      if (retentionDays > 7) {
        // Long-term retention: $0.06 per vCPU per month
        const vCPUs = this.getInstanceVCPUs(instanceClass);
        piCost = this.monthlyToHourly(vCPUs * 0.06 * (retentionDays / 30));
      }
    }
    
    // Enhanced Monitoring
    let monitoringCost = 0;
    if (config.monitoring_interval && config.monitoring_interval < 60) {
      // CloudWatch Logs cost estimate
      monitoringCost = this.monthlyToHourly(5); // Estimate $5/month
    }
    
    const totalHourly = instancePricing + storageCost + iopsCost + backupCost + piCost + monitoringCost;

    return this.formatCostResponse(totalHourly, {
      compute: instancePricing,
      storage: storageCost,
      iops: iopsCost,
      backup: backupCost,
      performanceInsights: piCost,
      monitoring: monitoringCost
    }, {
      instanceClass,
      engine,
      multiAZ,
      allocatedStorage,
      storageType,
      iops,
      region
    });
  }

  async calculateClusterCost(resource, region) {
    const config = resource.config;
    const engine = config.engine || 'aurora-mysql';
    
    // Aurora Serverless v2
    if (config.serverlessv2_scaling_configuration) {
      return this.calculateServerlessV2Cost(resource, region);
    }
    
    // Aurora storage: $0.10 per GB-month
    const estimatedStorageGB = config._estimated_storage_gb || 50;
    const storageCost = this.monthlyToHourly(estimatedStorageGB * 0.10);
    
    // I/O cost: $0.20 per million requests
    const estimatedIOMillions = config._estimated_io_millions || 10;
    const ioCost = this.monthlyToHourly(estimatedIOMillions * 0.20);
    
    // Backup storage (beyond cluster storage)
    const backupCost = 0; // First backup equal to storage is free
    
    const totalHourly = storageCost + ioCost + backupCost;

    return this.formatCostResponse(totalHourly, {
      storage: storageCost,
      io: ioCost,
      backup: backupCost
    }, {
      engine,
      estimatedStorageGB,
      estimatedIOMillions,
      note: 'Cluster instance costs are calculated separately'
    });
  }

  async calculateServerlessV2Cost(resource, region) {
    const config = resource.config;
    const scalingConfig = config.serverlessv2_scaling_configuration[0];
    const minCapacity = scalingConfig.min_capacity || 0.5;
    const maxCapacity = scalingConfig.max_capacity || 1;
    
    // Average ACU usage estimate (between min and max)
    const avgACU = (minCapacity + maxCapacity) / 2;
    
    // Aurora Serverless v2: $0.12 per ACU-hour
    const computeCost = avgACU * 0.12;
    
    // Storage cost
    const estimatedStorageGB = config._estimated_storage_gb || 50;
    const storageCost = this.monthlyToHourly(estimatedStorageGB * 0.10);
    
    const totalHourly = computeCost + storageCost;

    return this.formatCostResponse(totalHourly, {
      compute: computeCost,
      storage: storageCost
    }, {
      minCapacity,
      maxCapacity,
      avgACU,
      estimatedStorageGB,
      note: 'Serverless v2 cost varies based on actual ACU usage'
    });
  }

  async calculateClusterInstanceCost(resource, region) {
    const config = resource.config;
    const instanceClass = config.instance_class || 'db.r5.large';
    const engine = config.engine || 'aurora-mysql';
    
    const instancePricing = await this.getAuroraInstancePricing(instanceClass, engine, region);

    return this.formatCostResponse(instancePricing, {
      compute: instancePricing
    }, {
      instanceClass,
      engine
    });
  }

  async calculateSnapshotCost(resource, region) {
    const estimatedSizeGB = resource.config._estimated_size_gb || 20;
    const snapshotPricing = 0.02; // $0.02 per GB-month
    
    const monthlyCost = estimatedSizeGB * snapshotPricing;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: hourly
    }, {
      estimatedSizeGB,
      note: 'Automated backups are free up to allocated storage'
    });
  }

  async calculateProxyCost(resource, region) {
    const config = resource.config;
    
    // RDS Proxy: priced per vCPU used
    const estimatedVCPUs = config._estimated_vcpus || 2;
    const vcpuPricing = 0.015; // $0.015 per vCPU per hour
    
    const hourly = estimatedVCPUs * vcpuPricing;

    return this.formatCostResponse(hourly, {
      proxy: hourly
    }, {
      estimatedVCPUs,
      note: 'Proxy cost based on estimated vCPU usage'
    });
  }

  async getInstancePricing(instanceClass, engine, region) {
    const cacheKey = `rds-${instanceClass}-${engine}-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const filters = [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceClass },
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'databaseEngine', Value: this.normalizeEngine(engine) },
        { Type: 'TERM_MATCH', Field: 'deploymentOption', Value: 'Single-AZ' }
      ];

      const priceList = await this.fetchPricing(filters);
      const prices = this.parsePriceFromResponse(priceList);
      
      if (prices && prices.length > 0) {
        this.setCache(cacheKey, prices[0].price);
        return prices[0].price;
      }
      
      return this.getFallbackPricing(instanceClass);
    } catch (error) {
      logger.error(`Failed to get RDS pricing for ${instanceClass}:`, error);
      return this.getFallbackPricing(instanceClass);
    }
  }

  async getAuroraInstancePricing(instanceClass, engine, region) {
    // Aurora pricing is slightly different
    const basePricing = await this.getInstancePricing(instanceClass, engine, region);
    return basePricing;
  }

  async getStoragePricing(storageType, region) {
    const pricing = {
      'gp2': 0.115,
      'gp3': 0.08,
      'io1': 0.125,
      'standard': 0.10
    };
    return pricing[storageType] || 0.115;
  }

  normalizeEngine(engine) {
    const mapping = {
      'mysql': 'MySQL',
      'postgres': 'PostgreSQL',
      'mariadb': 'MariaDB',
      'oracle-se2': 'Oracle',
      'sqlserver-ex': 'SQL Server',
      'aurora-mysql': 'Aurora MySQL',
      'aurora-postgresql': 'Aurora PostgreSQL'
    };
    return mapping[engine.toLowerCase()] || engine;
  }

  getInstanceVCPUs(instanceClass) {
    const vcpuMapping = {
      'db.t3.micro': 2,
      'db.t3.small': 2,
      'db.t3.medium': 2,
      'db.t3.large': 2,
      'db.r5.large': 2,
      'db.r5.xlarge': 4,
      'db.r5.2xlarge': 8
    };
    return vcpuMapping[instanceClass] || 2;
  }

  getFallbackPricing(instanceClass) {
    const fallback = {
      'db.t3.micro': 0.017,
      'db.t3.small': 0.034,
      'db.t3.medium': 0.068,
      'db.t3.large': 0.136,
      'db.t4g.micro': 0.016,
      'db.t4g.small': 0.032,
      'db.r5.large': 0.25,
      'db.r5.xlarge': 0.50
    };
    return fallback[instanceClass] || 0.068;
  }
}