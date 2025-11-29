import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class DynamoDBPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'DynamoDB');
  }

  getServiceCode() {
    return 'AmazonDynamoDB';
  }

  getSupportedResourceTypes() {
    return [
      'aws_dynamodb_table',
      'aws_dynamodb_global_table',
      'aws_dynamodb_table_item',
      'aws_dynamodb_table_replica',
      'aws_dynamodb_kinesis_streaming_destination',
      'aws_dynamodb_contributor_insights'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_dynamodb_table':
        return this.calculateTableCost(resource, region);
      case 'aws_dynamodb_global_table':
        return this.calculateGlobalTableCost(resource, region);
      case 'aws_dynamodb_table_replica':
        return this.calculateReplicaCost(resource, region);
      default:
        return null;
    }
  }

  async calculateTableCost(resource, region) {
    const config = resource.config;
    const billingMode = config.billing_mode || 'PROVISIONED';
    
    if (billingMode === 'PAY_PER_REQUEST') {
      return this.calculateOnDemandCost(resource, region);
    }
    
    return this.calculateProvisionedCost(resource, region);
  }

  async calculateProvisionedCost(resource, region) {
    const config = resource.config;
    
    // Read capacity
    const readCapacity = config.read_capacity || 5;
    const readCostPerUnit = 0.00013; // $0.00013 per RCU per hour
    const readCost = readCapacity * readCostPerUnit;
    
    // Write capacity
    const writeCapacity = config.write_capacity || 5;
    const writeCostPerUnit = 0.00065; // $0.00065 per WCU per hour
    const writeCost = writeCapacity * writeCostPerUnit;
    
    // Global Secondary Indexes
    let gsiCost = 0;
    if (config.global_secondary_index) {
      const gsis = Array.isArray(config.global_secondary_index) 
        ? config.global_secondary_index 
        : [config.global_secondary_index];
      
      for (const gsi of gsis) {
        const gsiRead = gsi.read_capacity || readCapacity;
        const gsiWrite = gsi.write_capacity || writeCapacity;
        gsiCost += (gsiRead * readCostPerUnit) + (gsiWrite * writeCostPerUnit);
      }
    }
    
    // Storage cost
    const estimatedStorageGB = config._estimated_storage_gb || 1;
    const storageCost = this.monthlyToHourly(estimatedStorageGB * 0.25);
    
    // Backup cost (on-demand backups)
    let backupCost = 0;
    if (config.point_in_time_recovery?.[0]?.enabled) {
      backupCost = this.monthlyToHourly(estimatedStorageGB * 0.20); // $0.20 per GB-month
    }
    
    // Streams cost
    let streamsCost = 0;
    if (config.stream_enabled) {
      const estimatedStreamReads = config._estimated_stream_reads || 100000;
      streamsCost = this.monthlyToHourly((estimatedStreamReads / 100000) * 0.02);
    }
    
    const totalHourly = readCost + writeCost + gsiCost + storageCost + backupCost + streamsCost;

    return this.formatCostResponse(totalHourly, {
      readCapacity: readCost,
      writeCapacity: writeCost,
      gsi: gsiCost,
      storage: storageCost,
      backup: backupCost,
      streams: streamsCost
    }, {
      billingMode: 'PROVISIONED',
      readCapacity,
      writeCapacity,
      estimatedStorageGB,
      pitrEnabled: config.point_in_time_recovery?.[0]?.enabled
    });
  }

  async calculateOnDemandCost(resource, region) {
    const config = resource.config;
    
    // On-demand pricing
    const estimatedReadRequests = config._estimated_read_requests || 1000000;
    const estimatedWriteRequests = config._estimated_write_requests || 100000;
    
    // $1.25 per million read request units
    const readCost = (estimatedReadRequests / 1000000) * 1.25;
    
    // $6.25 per million write request units
    const writeCost = (estimatedWriteRequests / 1000000) * 6.25;
    
    // Storage cost
    const estimatedStorageGB = config._estimated_storage_gb || 1;
    const storageCost = estimatedStorageGB * 0.25;
    
    const monthlyCost = readCost + writeCost + storageCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      reads: this.monthlyToHourly(readCost),
      writes: this.monthlyToHourly(writeCost),
      storage: this.monthlyToHourly(storageCost)
    }, {
      billingMode: 'PAY_PER_REQUEST',
      estimatedReadRequests,
      estimatedWriteRequests,
      estimatedStorageGB,
      note: 'On-demand costs vary based on actual usage'
    });
  }

  async calculateGlobalTableCost(resource, region) {
    // Global tables have replication costs
    const config = resource.config;
    const replicaCount = config.replica?.length || 1;
    
    // Base table cost
    const tableCost = await this.calculateTableCost(resource, region);
    
    // Replicated write capacity (charged per region)
    const replicationCost = tableCost.hourly * (replicaCount - 1);
    
    // Cross-region data transfer
    const estimatedTransferGB = config._estimated_transfer_gb || 10;
    const transferCost = this.monthlyToHourly(estimatedTransferGB * 0.02 * (replicaCount - 1));
    
    const totalHourly = tableCost.hourly + replicationCost + transferCost;

    return this.formatCostResponse(totalHourly, {
      ...tableCost.breakdown,
      replication: replicationCost,
      dataTransfer: transferCost
    }, {
      ...tableCost.details,
      replicaCount,
      note: 'Global table costs include replication to all regions'
    });
  }

  async calculateReplicaCost(resource, region) {
    // Replica costs are similar to primary table
    return this.calculateTableCost(resource, region);
  }
}