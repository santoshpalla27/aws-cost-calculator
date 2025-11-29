import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class MSKPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'MSK');
  }

  getServiceCode() {
    return 'AmazonMSK';
  }

  getSupportedResourceTypes() {
    return [
      'aws_msk_cluster',
      'aws_msk_serverless_cluster',
      'aws_msk_configuration'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_msk_cluster':
        return this.calculateClusterCost(resource, region);
      case 'aws_msk_serverless_cluster':
        return this.calculateServerlessCost(resource, region);
      default:
        return null;
    }
  }

  async calculateClusterCost(resource, region) {
    const config = resource.config;
    const brokerNodeConfig = config.broker_node_group_info?.[0] || {};
    
    const instanceType = brokerNodeConfig.instance_type || 'kafka.m5.large';
    const brokerCount = brokerNodeConfig.az_distribution === 'DEFAULT' 
      ? (config.number_of_broker_nodes || 3)
      : (brokerNodeConfig.number_of_broker_nodes || 3);
    
    // Broker instance cost
    const brokerPricing = await this.getBrokerPricing(instanceType, region);
    const brokerCost = brokerPricing * brokerCount;
    
    // Storage cost
    const storagePerBrokerGB = brokerNodeConfig.ebs_volume_size || 100;
    const storagePricing = 0.10; // $0.10 per GB-month
    const storageCost = this.monthlyToHourly(storagePerBrokerGB * brokerCount * storagePricing);
    
    // Data transfer (estimated)
    const estimatedDataTransferGB = config._estimated_data_transfer_gb || 100;
    const dataTransferCost = this.monthlyToHourly(estimatedDataTransferGB * 0.02);
    
    const totalHourly = brokerCost + storageCost + dataTransferCost;

    return this.formatCostResponse(totalHourly, {
      brokers: brokerCost,
      storage: storageCost,
      dataTransfer: dataTransferCost
    }, {
      instanceType,
      brokerCount,
      storagePerBrokerGB,
      totalStorageGB: storagePerBrokerGB * brokerCount
    });
  }

  async calculateServerlessCost(resource, region) {
    const config = resource.config;
    
    // Serverless pricing
    // Cluster hours: $0.75 per hour
    const clusterCost = 0.75;
    
    // Partition hours: $0.0015 per partition hour
    const estimatedPartitions = config._estimated_partitions || 10;
    const partitionCost = estimatedPartitions * 0.0015;
    
    // Data in: $0.10 per GB
    // Data out: $0.05 per GB
    const estimatedDataInGB = config._estimated_data_in_gb || 100;
    const estimatedDataOutGB = config._estimated_data_out_gb || 100;
    const dataCost = this.monthlyToHourly((estimatedDataInGB * 0.10) + (estimatedDataOutGB * 0.05));
    
    // Storage: $0.10 per GB-hour
    const estimatedStorageGB = config._estimated_storage_gb || 10;
    const storageCost = estimatedStorageGB * 0.10;
    
    const totalHourly = clusterCost + partitionCost + dataCost + storageCost;

    return this.formatCostResponse(totalHourly, {
      cluster: clusterCost,
      partitions: partitionCost,
      data: dataCost,
      storage: storageCost
    }, {
      estimatedPartitions,
      estimatedDataInGB,
      estimatedDataOutGB,
      estimatedStorageGB,
      note: 'Serverless costs vary based on actual usage'
    });
  }

  async getBrokerPricing(instanceType, region) {
    const fallback = {
      'kafka.t3.small': 0.038,
      'kafka.m5.large': 0.21,
      'kafka.m5.xlarge': 0.42,
      'kafka.m5.2xlarge': 0.84,
      'kafka.m5.4xlarge': 1.68
    };
    return fallback[instanceType] || 0.21;
  }
}