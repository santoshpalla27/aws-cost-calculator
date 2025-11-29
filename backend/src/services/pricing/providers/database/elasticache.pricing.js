import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class ElastiCachePricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'ElastiCache');
  }

  getServiceCode() {
    return 'AmazonElastiCache';
  }

  getSupportedResourceTypes() {
    return [
      'aws_elasticache_cluster',
      'aws_elasticache_replication_group',
      'aws_elasticache_serverless_cache',
      'aws_elasticache_parameter_group',
      'aws_elasticache_subnet_group',
      'aws_elasticache_user',
      'aws_elasticache_user_group',
      'aws_elasticache_global_replication_group'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_elasticache_cluster':
        return this.calculateClusterCost(resource, region);
      case 'aws_elasticache_replication_group':
        return this.calculateReplicationGroupCost(resource, region);
      case 'aws_elasticache_serverless_cache':
        return this.calculateServerlessCost(resource, region);
      case 'aws_elasticache_global_replication_group':
        return this.calculateGlobalReplicationGroupCost(resource, region);
      default:
        return null;
    }
  }

  async calculateClusterCost(resource, region) {
    const config = resource.config;
    const nodeType = config.node_type || 'cache.t3.micro';
    const numCacheNodes = config.num_cache_nodes || 1;
    const engine = config.engine || 'redis';
    
    const nodePricing = await this.getNodePricing(nodeType, engine, region);
    const computeCost = nodePricing * numCacheNodes;
    
    // Backup storage (Redis only)
    let backupCost = 0;
    if (engine === 'redis' && config.snapshot_retention_limit > 0) {
      const estimatedBackupGB = config._estimated_backup_gb || 1;
      backupCost = this.monthlyToHourly(estimatedBackupGB * 0.085);
    }
    
    const totalHourly = computeCost + backupCost;

    return this.formatCostResponse(totalHourly, {
      compute: computeCost,
      backup: backupCost
    }, {
      nodeType,
      numCacheNodes,
      engine,
      region
    });
  }

  async calculateReplicationGroupCost(resource, region) {
    const config = resource.config;
    const nodeType = config.node_type || 'cache.t3.micro';
    const engine = 'redis';
    
    // Calculate total nodes
    let totalNodes = 1;
    
    if (config.num_node_groups && config.replicas_per_node_group !== undefined) {
      // Cluster mode enabled
      const nodeGroups = config.num_node_groups || 1;
      const replicasPerGroup = config.replicas_per_node_group || 0;
      totalNodes = nodeGroups * (1 + replicasPerGroup);
      logger.info(`ElastiCache replication group: ${nodeGroups} shards × (1 primary + ${replicasPerGroup} replicas) = ${totalNodes} nodes`);
    } else if (config.number_cache_clusters) {
      // Cluster mode disabled
      totalNodes = config.number_cache_clusters;
    } else if (config.num_cache_clusters) {
      totalNodes = config.num_cache_clusters;
    }
    
    const nodePricing = await this.getNodePricing(nodeType, engine, region);
    const computeCost = nodePricing * totalNodes;
    
    // Backup storage
    let backupCost = 0;
    if (config.snapshot_retention_limit && config.snapshot_retention_limit > 0) {
      const estimatedBackupGB = config._estimated_backup_gb || totalNodes * 2;
      backupCost = this.monthlyToHourly(estimatedBackupGB * 0.085);
    }
    
    // Data tiering (if using r6gd instances)
    let tieringCost = 0;
    if (nodeType.includes('r6gd')) {
      const estimatedSSDStorageGB = config._estimated_ssd_storage_gb || 100;
      tieringCost = this.monthlyToHourly(estimatedSSDStorageGB * 0.023);
    }
    
    const totalHourly = computeCost + backupCost + tieringCost;

    return this.formatCostResponse(totalHourly, {
      compute: computeCost,
      backup: backupCost,
      tiering: tieringCost
    }, {
      nodeType,
      totalNodes,
      numNodeGroups: config.num_node_groups,
      replicasPerNodeGroup: config.replicas_per_node_group,
      engine
    });
  }

  async calculateServerlessCost(resource, region) {
    const config = resource.config;
    
    // Serverless pricing
    // Data stored: $0.125 per GB-hour
    // ElastiCache Processing Units (ECPUs): $0.0034 per million ECPUs
    
    const estimatedStorageGB = config._estimated_storage_gb || 1;
    const storageCost = estimatedStorageGB * 0.125;
    
    const estimatedECPUs = config._estimated_ecpu_millions || 10;
    const ecpuCost = this.monthlyToHourly(estimatedECPUs * 0.0034 * 730); // Convert to hourly
    
    const totalHourly = storageCost + ecpuCost;

    return this.formatCostResponse(totalHourly, {
      storage: storageCost,
      ecpu: ecpuCost
    }, {
      estimatedStorageGB,
      estimatedECPUs,
      note: 'Serverless costs vary based on actual usage'
    });
  }

  async calculateGlobalReplicationGroupCost(resource, region) {
    // Global datastore costs
    const config = resource.config;
    
    // Cross-region replication data transfer
    const estimatedTransferGB = config._estimated_transfer_gb || 10;
    const transferCost = this.monthlyToHourly(estimatedTransferGB * 0.02);

    return this.formatCostResponse(transferCost, {
      dataTransfer: transferCost
    }, {
      estimatedTransferGB,
      note: 'Global datastore incurs cross-region data transfer costs'
    });
  }

  async getNodePricing(nodeType, engine, region) {
    const cacheKey = `elasticache-${nodeType}-${engine}-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const filters = [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: nodeType },
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'cacheEngine', Value: engine === 'redis' ? 'Redis' : 'Memcached' }
      ];

      const priceList = await this.fetchPricing(filters);
      const prices = this.parsePriceFromResponse(priceList);
      
      if (prices && prices.length > 0) {
        this.setCache(cacheKey, prices[0].price);
        return prices[0].price;
      }
      
      return this.getFallbackPricing(nodeType);
    } catch (error) {
      logger.error(`Failed to get ElastiCache pricing for ${nodeType}:`, error);
      return this.getFallbackPricing(nodeType);
    }
  }

  getFallbackPricing(nodeType) {
    const fallback = {
      'cache.t3.micro': 0.017,
      'cache.t3.small': 0.034,
      'cache.t3.medium': 0.068,
      'cache.r6g.large': 0.139,
      'cache.r6g.xlarge': 0.278,
      'cache.m6g.large': 0.112
    };
    return fallback[nodeType] || 0.034;
  }
}