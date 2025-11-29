import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class S3PricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'S3');
  }

  getServiceCode() {
    return 'AmazonS3';
  }

  getSupportedResourceTypes() {
    return [
      'aws_s3_bucket',
      'aws_s3_bucket_versioning',
      'aws_s3_bucket_lifecycle_configuration',
      'aws_s3_bucket_replication_configuration',
      'aws_s3_bucket_intelligent_tiering_configuration',
      'aws_s3_bucket_analytics_configuration',
      'aws_s3_bucket_inventory',
      'aws_s3_bucket_logging',
      'aws_s3_bucket_accelerate_configuration',
      'aws_s3_object',
      'aws_s3_bucket_object' // Legacy
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_s3_bucket':
        return this.calculateBucketCost(resource, region);
      case 'aws_s3_bucket_versioning':
        return this.calculateVersioningCost(resource, region);
      case 'aws_s3_bucket_replication_configuration':
        return this.calculateReplicationCost(resource, region);
      case 'aws_s3_bucket_intelligent_tiering_configuration':
        return this.calculateIntelligentTieringCost(resource, region);
      case 'aws_s3_bucket_analytics_configuration':
        return this.calculateAnalyticsCost(resource, region);
      case 'aws_s3_bucket_inventory':
        return this.calculateInventoryCost(resource, region);
      case 'aws_s3_bucket_accelerate_configuration':
        return this.calculateTransferAccelerationCost(resource, region);
      default:
        return null;
    }
  }

  async calculateBucketCost(resource, region) {
    const config = resource.config;
    
    // Estimate storage based on config hints or defaults
    const estimatedStorageGB = config._estimated_storage_gb || 100;
    const storageClass = this.inferStorageClass(config);
    
    // Get storage pricing
    const storagePricing = await this.getStoragePricing(storageClass, region);
    const storageCost = estimatedStorageGB * storagePricing;
    
    // Request pricing estimates
    const estimatedPutRequests = config._estimated_put_requests || 10000;
    const estimatedGetRequests = config._estimated_get_requests || 100000;
    
    const requestPricing = this.getRequestPricing(storageClass);
    const putCost = (estimatedPutRequests / 1000) * requestPricing.put;
    const getCost = (estimatedGetRequests / 1000) * requestPricing.get;
    
    // Data transfer
    const estimatedDataTransferGB = config._estimated_data_transfer_gb || 10;
    const dataTransferCost = estimatedDataTransferGB * 0.09; // $0.09/GB out to internet
    
    const monthlyCost = storageCost + putCost + getCost + dataTransferCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: this.monthlyToHourly(storageCost),
      putRequests: this.monthlyToHourly(putCost),
      getRequests: this.monthlyToHourly(getCost),
      dataTransfer: this.monthlyToHourly(dataTransferCost)
    }, {
      storageClass,
      estimatedStorageGB,
      estimatedPutRequests,
      estimatedGetRequests,
      estimatedDataTransferGB,
      note: 'S3 costs vary significantly based on storage class and usage patterns'
    });
  }

  async calculateVersioningCost(resource, region) {
    // Versioning increases storage costs for version history
    // Estimate 30% additional storage for versions
    const config = resource.config;
    
    if (config.versioning_configuration?.[0]?.status !== 'Enabled') {
      return null;
    }

    const estimatedStorageGB = config._estimated_storage_gb || 100;
    const versionOverhead = 0.30; // 30% overhead estimate
    const additionalStorage = estimatedStorageGB * versionOverhead;
    
    const storagePricing = 0.023; // Standard pricing
    const monthlyCost = additionalStorage * storagePricing;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      versionStorage: hourly
    }, {
      versioningEnabled: true,
      additionalStorageGB: additionalStorage,
      note: 'Versioning cost estimate based on 30% storage overhead'
    });
  }

  async calculateReplicationCost(resource, region) {
    const config = resource.config;
    
    // Replication costs:
    // 1. Request charges for replication PUT
    // 2. Data transfer between regions
    // 3. Storage in destination bucket
    
    const estimatedStorageGB = config._estimated_storage_gb || 100;
    const estimatedObjectCount = config._estimated_object_count || 10000;
    
    // Replication request cost: $0.005 per 1000 objects
    const replicationRequestCost = (estimatedObjectCount / 1000) * 0.005;
    
    // Cross-region data transfer: $0.02 per GB
    const isCrossRegion = config.rule?.[0]?.destination?.[0]?.bucket?.includes('arn:aws:s3');
    const dataTransferCost = isCrossRegion ? estimatedStorageGB * 0.02 : 0;
    
    const monthlyCost = replicationRequestCost + dataTransferCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      replicationRequests: this.monthlyToHourly(replicationRequestCost),
      dataTransfer: this.monthlyToHourly(dataTransferCost)
    }, {
      crossRegion: isCrossRegion,
      estimatedObjectCount,
      note: 'Replication costs exclude destination storage (charged separately)'
    });
  }

  async calculateIntelligentTieringCost(resource, region) {
    const config = resource.config;
    
    // Intelligent Tiering monitoring fee: $0.0025 per 1,000 objects
    const estimatedObjectCount = config._estimated_object_count || 10000;
    const monitoringCost = (estimatedObjectCount / 1000) * 0.0025;
    
    const hourly = this.monthlyToHourly(monitoringCost);

    return this.formatCostResponse(hourly, {
      monitoring: hourly
    }, {
      estimatedObjectCount,
      note: 'Intelligent Tiering can reduce storage costs by automatically moving objects'
    });
  }

  async calculateAnalyticsCost(resource, region) {
    // S3 Analytics: $0.10 per million objects analyzed
    const estimatedObjectCount = resource.config._estimated_object_count || 10000;
    const monthlyCost = (estimatedObjectCount / 1000000) * 0.10;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      analytics: hourly
    }, {
      estimatedObjectCount
    });
  }

  async calculateInventoryCost(resource, region) {
    // S3 Inventory: $0.0025 per million objects listed
    const estimatedObjectCount = resource.config._estimated_object_count || 10000;
    const monthlyCost = (estimatedObjectCount / 1000000) * 0.0025;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      inventory: hourly
    }, {
      estimatedObjectCount
    });
  }

  async calculateTransferAccelerationCost(resource, region) {
    const config = resource.config;
    
    if (config.status !== 'Enabled') {
      return null;
    }

    // Transfer Acceleration: $0.04-0.08 per GB additional
    const estimatedTransferGB = config._estimated_transfer_gb || 100;
    const accelerationCost = estimatedTransferGB * 0.04;
    
    const hourly = this.monthlyToHourly(accelerationCost);

    return this.formatCostResponse(hourly, {
      acceleration: hourly
    }, {
      estimatedTransferGB,
      note: 'Transfer Acceleration cost is additional to standard data transfer'
    });
  }

  inferStorageClass(config) {
    // Check for lifecycle rules that might change storage class
    if (config.lifecycle_rule) {
      const rules = Array.isArray(config.lifecycle_rule) 
        ? config.lifecycle_rule 
        : [config.lifecycle_rule];
      
      for (const rule of rules) {
        if (rule.transition) {
          return rule.transition[0]?.storage_class || 'STANDARD';
        }
      }
    }
    return 'STANDARD';
  }

  async getStoragePricing(storageClass, region) {
    const pricing = {
      'STANDARD': 0.023,
      'INTELLIGENT_TIERING': 0.023,
      'STANDARD_IA': 0.0125,
      'ONEZONE_IA': 0.01,
      'GLACIER_INSTANT_RETRIEVAL': 0.004,
      'GLACIER': 0.004,
      'GLACIER_FLEXIBLE_RETRIEVAL': 0.0036,
      'DEEP_ARCHIVE': 0.00099
    };
    return pricing[storageClass] || 0.023;
  }

  getRequestPricing(storageClass) {
    const pricing = {
      'STANDARD': { put: 0.005, get: 0.0004 },
      'INTELLIGENT_TIERING': { put: 0.005, get: 0.0004 },
      'STANDARD_IA': { put: 0.01, get: 0.001 },
      'ONEZONE_IA': { put: 0.01, get: 0.001 },
      'GLACIER': { put: 0.03, get: 0.0004 },
      'DEEP_ARCHIVE': { put: 0.05, get: 0.0004 }
    };
    return pricing[storageClass] || pricing['STANDARD'];
  }
}