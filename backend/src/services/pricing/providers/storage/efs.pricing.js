import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class EFSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'EFS');
  }

  getServiceCode() {
    return 'AmazonEFS';
  }

  getSupportedResourceTypes() {
    return [
      'aws_efs_file_system',
      'aws_efs_mount_target',
      'aws_efs_access_point',
      'aws_efs_backup_policy',
      'aws_efs_replication_configuration'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_efs_file_system':
        return this.calculateFileSystemCost(resource, region);
      case 'aws_efs_replication_configuration':
        return this.calculateReplicationCost(resource, region);
      default:
        return null;
    }
  }

  async calculateFileSystemCost(resource, region) {
    const config = resource.config;
    const throughputMode = config.throughput_mode || 'bursting';
    const performanceMode = config.performance_mode || 'generalPurpose';
    
    // Estimate storage
    const estimatedStorageGB = config._estimated_storage_gb || 100;
    
    // Storage pricing
    let storagePricing;
    if (config.lifecycle_policy) {
      // Using lifecycle policy for IA storage
      const iaPercent = 0.8; // Assume 80% goes to IA after lifecycle
      storagePricing = (0.30 * 0.2) + (0.016 * iaPercent); // Standard + IA
    } else {
      storagePricing = 0.30; // Standard storage: $0.30/GB-month
    }
    
    const storageCost = estimatedStorageGB * storagePricing;
    
    // Provisioned throughput cost (if applicable)
    let throughputCost = 0;
    if (throughputMode === 'provisioned' && config.provisioned_throughput_in_mibps) {
      const provisionedThroughput = config.provisioned_throughput_in_mibps;
      throughputCost = provisionedThroughput * 6.00; // $6.00 per MiB/s-month
    }
    
    // Elastic throughput (additional cost for burst)
    let elasticCost = 0;
    if (throughputMode === 'elastic') {
      // Estimate based on usage
      const estimatedReadThroughputGB = config._estimated_read_throughput_gb || 10;
      const estimatedWriteThroughputGB = config._estimated_write_throughput_gb || 5;
      elasticCost = (estimatedReadThroughputGB * 0.03) + (estimatedWriteThroughputGB * 0.06);
    }
    
    const monthlyCost = storageCost + throughputCost + elasticCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      storage: this.monthlyToHourly(storageCost),
      throughput: this.monthlyToHourly(throughputCost),
      elastic: this.monthlyToHourly(elasticCost)
    }, {
      throughputMode,
      performanceMode,
      estimatedStorageGB,
      provisionedThroughput: config.provisioned_throughput_in_mibps,
      note: 'EFS costs depend on storage volume and throughput mode'
    });
  }

  async calculateReplicationCost(resource, region) {
    // Replication costs data transfer between regions
    const estimatedStorageGB = resource.config._estimated_storage_gb || 100;
    const dataTransferCost = estimatedStorageGB * 0.02; // $0.02/GB cross-region
    
    const hourly = this.monthlyToHourly(dataTransferCost);

    return this.formatCostResponse(hourly, {
      dataTransfer: hourly
    }, {
      estimatedStorageGB,
      note: 'Replication incurs cross-region data transfer costs'
    });
  }
}