import logger from '../config/logger.config.js';

export class DataMockerService {
  constructor() {
    this.mockingRules = {
      required: [
        'instance_type',
        'ami',
        'allocated_storage',
        'instance_class',
        'engine',
        'bucket'
      ],
      optional: [
        'tags',
        'user_data',
        'key_name',
        'security_groups'
      ]
    };
  }

  shouldMockValue(resourceType, attributeName, currentValue) {
    // Only mock if value is undefined or references something we can't resolve
    if (currentValue !== undefined && 
        currentValue !== null && 
        !this.isUnresolvedReference(currentValue)) {
      return false;
    }

    // Check if this is a required attribute for cost calculation
    return this.isRequiredForCosting(resourceType, attributeName);
  }

  isUnresolvedReference(value) {
    if (typeof value !== 'string') return false;
    
    // Check for unresolved Terraform references
    const patterns = [
      /\$\{var\./,
      /\$\{data\./,
      /\$\{local\./,
      /\$\{module\./
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  isRequiredForCosting(resourceType, attributeName) {
    const costingAttributes = {
      'aws_instance': ['instance_type', 'ami'],
      'aws_db_instance': ['instance_class', 'engine', 'allocated_storage'],
      'aws_ebs_volume': ['size', 'type'],
      'aws_s3_bucket': ['bucket'],
      'aws_rds_cluster': ['engine', 'instance_class'],
      'aws_elasticache_cluster': ['node_type', 'num_cache_nodes'],
      'aws_elasticsearch_domain': ['instance_type', 'instance_count']
    };

    const required = costingAttributes[resourceType] || [];
    return required.includes(attributeName);
  }

  mockEC2Instance(resource) {
    const mocked = { ...resource.config };
    const hasMocked = { attributes: [] };

    if (this.shouldMockValue('aws_instance', 'instance_type', mocked.instance_type)) {
      mocked.instance_type = this.selectReasonableInstanceType();
      hasMocked.attributes.push('instance_type');
      logger.info(`Mocked instance_type for ${resource.name}: ${mocked.instance_type}`);
    }

    if (this.shouldMockValue('aws_instance', 'ami', mocked.ami)) {
      const region = mocked.availability_zone ? 
        mocked.availability_zone.split('-').slice(0, -1).join('-') : 'us-east-1';
      mocked.ami = this.getDefaultAMI(region);
      hasMocked.attributes.push('ami');
      logger.info(`Mocked AMI for ${resource.name}: ${mocked.ami}`);
    }

    // Don't mock optional attributes that don't affect cost
    return { config: mocked, mocked: hasMocked };
  }

  mockRDSInstance(resource) {
    const mocked = { ...resource.config };
    const hasMocked = { attributes: [] };

    if (this.shouldMockValue('aws_db_instance', 'instance_class', mocked.instance_class)) {
      mocked.instance_class = 'db.t3.micro';
      hasMocked.attributes.push('instance_class');
      logger.info(`Mocked instance_class for ${resource.name}: ${mocked.instance_class}`);
    }

    if (this.shouldMockValue('aws_db_instance', 'engine', mocked.engine)) {
      mocked.engine = 'postgres';
      hasMocked.attributes.push('engine');
      logger.info(`Mocked engine for ${resource.name}: ${mocked.engine}`);
    }

    if (this.shouldMockValue('aws_db_instance', 'allocated_storage', mocked.allocated_storage)) {
      mocked.allocated_storage = 20;
      hasMocked.attributes.push('allocated_storage');
      logger.info(`Mocked allocated_storage for ${resource.name}: ${mocked.allocated_storage}`);
    }

    if (this.shouldMockValue('aws_db_instance', 'engine_version', mocked.engine_version)) {
      mocked.engine_version = this.getDefaultEngineVersion(mocked.engine);
      hasMocked.attributes.push('engine_version');
    }

    return { config: mocked, mocked: hasMocked };
  }

  mockEBSVolume(resource) {
    const mocked = { ...resource.config };
    const hasMocked = { attributes: [] };

    if (this.shouldMockValue('aws_ebs_volume', 'size', mocked.size)) {
      mocked.size = 10;
      hasMocked.attributes.push('size');
      logger.info(`Mocked size for ${resource.name}: ${mocked.size}`);
    }

    if (this.shouldMockValue('aws_ebs_volume', 'type', mocked.type)) {
      mocked.type = 'gp3';
      hasMocked.attributes.push('type');
      logger.info(`Mocked type for ${resource.name}: ${mocked.type}`);
    }

    return { config: mocked, mocked: hasMocked };
  }

  mockS3Bucket(resource) {
    const mocked = { ...resource.config };
    const hasMocked = { attributes: [] };

    // S3 buckets don't require much mocking for cost estimation
    // Storage is usually calculated based on usage, which we'll estimate

    return { config: mocked, mocked: hasMocked };
  }

  mockResourceConfig(resource) {
    switch (resource.type) {
      case 'aws_instance':
        return this.mockEC2Instance(resource);
      case 'aws_db_instance':
        return this.mockRDSInstance(resource);
      case 'aws_ebs_volume':
        return this.mockEBSVolume(resource);
      case 'aws_s3_bucket':
        return this.mockS3Bucket(resource);
      default:
        return { config: resource.config, mocked: { attributes: [] } };
    }
  }

  selectReasonableInstanceType() {
    // Select a commonly used, cost-effective instance type
    const reasonableTypes = [
      't3.micro',   // Development/testing
      't3.small',   // Small workloads
      't3.medium'   // Medium workloads
    ];

    // Default to t3.small as a reasonable middle ground
    return 't3.small';
  }

  getDefaultAMI(region) {
    // Amazon Linux 2 AMIs by region (these are examples, would need updating)
    const defaultAMIs = {
      'us-east-1': 'ami-0c55b159cbfafe1f0',
      'us-west-2': 'ami-0d1cd67c26f5fca19',
      'eu-west-1': 'ami-0bbc25e23a7640b9b',
      'ap-southeast-1': 'ami-0c5199d385b432989'
    };

    return defaultAMIs[region] || defaultAMIs['us-east-1'];
  }

  getDefaultEngineVersion(engine) {
    const versions = {
      'postgres': '14.7',
      'mysql': '8.0.32',
      'mariadb': '10.11.2',
      'aurora-mysql': '5.7.mysql_aurora.2.11.2',
      'aurora-postgresql': '14.6'
    };

    return versions[engine] || '14.7';
  }

  generateMockingReport(resources) {
    const report = {
      totalResources: resources.length,
      mockedResources: 0,
      mockedAttributes: {},
      warnings: []
    };

    for (const resource of resources) {
      if (resource.mocked && resource.mocked.attributes.length > 0) {
        report.mockedResources++;
        report.mockedAttributes[`${resource.type}.${resource.name}`] = 
          resource.mocked.attributes;
      }
    }

    if (report.mockedResources > 0) {
      report.warnings.push(
        `${report.mockedResources} resources had values mocked for cost estimation. ` +
        `Results may not reflect actual costs. Please provide complete configuration for accurate estimates.`
      );
    }

    return report;
  }
}