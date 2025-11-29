import logger from '../config/logger.config.js';

/**
 * Service for mocking missing required data in Terraform configurations
 * Used when variable resolution fails or required attributes are missing
 */
export class DataMockerService {
  constructor() {
    // Define required attributes for cost calculation per resource type
    this.requiredAttributes = {
      'aws_instance': ['instance_type'],
      'aws_db_instance': ['instance_class', 'engine'],
      'aws_rds_cluster': ['engine'],
      'aws_rds_cluster_instance': ['instance_class'],
      'aws_ebs_volume': ['size', 'type'],
      'aws_elasticache_cluster': ['node_type'],
      'aws_elasticache_replication_group': ['node_type'],
      'aws_launch_template': ['instance_type'],
      'aws_lambda_function': ['memory_size'],
      'aws_ecs_service': ['desired_count'],
      'aws_eks_node_group': ['instance_types'],
      'aws_dynamodb_table': ['billing_mode'],
      'aws_msk_cluster': ['broker_node_group_info']
    };

    // Default values for mocking
    this.defaults = {
      'instance_type': 't3.small',
      'instance_class': 'db.t3.micro',
      'engine': 'mysql',
      'size': 20,
      'type': 'gp3',
      'node_type': 'cache.t3.micro',
      'memory_size': 128,
      'desired_count': 1,
      'instance_types': ['t3.medium'],
      'billing_mode': 'PAY_PER_REQUEST'
    };
  }

  /**
   * Check if a value needs to be mocked
   */
  shouldMockValue(resourceType, attributeName, currentValue) {
    // Don't mock if we have a valid value
    if (currentValue !== undefined && 
        currentValue !== null && 
        currentValue !== '') {
      
      // Check if it's an unresolved Terraform reference
      if (typeof currentValue === 'string' && this.isUnresolvedReference(currentValue)) {
        logger.warn(`Unresolved reference found: ${attributeName} = ${currentValue}`);
        return this.isRequiredForCosting(resourceType, attributeName);
      }
      
      return false;
    }

    return this.isRequiredForCosting(resourceType, attributeName);
  }

  /**
   * Check if value is an unresolved Terraform reference
   */
  isUnresolvedReference(value) {
    if (typeof value !== 'string') return false;
    
    const patterns = [
      /^\$\{var\./,
      /^\$\{data\./,
      /^\$\{local\./,
      /^\$\{module\./,
      /^\$\{aws_/,
      /^var\./,
      /^data\./,
      /^local\./,
      /^module\./
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if attribute is required for cost calculation
   */
  isRequiredForCosting(resourceType, attributeName) {
    const required = this.requiredAttributes[resourceType] || [];
    return required.includes(attributeName);
  }

  /**
   * Mock resource configuration - returns mocked config and report
   */
  mockResourceConfig(resource) {
    const mocked = { ...resource.config };
    const mockedAttributes = [];

    const requiredAttrs = this.requiredAttributes[resource.type] || [];

    for (const attr of requiredAttrs) {
      if (this.shouldMockValue(resource.type, attr, mocked[attr])) {
        const defaultValue = this.defaults[attr];
        if (defaultValue !== undefined) {
          mocked[attr] = defaultValue;
          mockedAttributes.push(attr);
          logger.warn(`Mocked ${attr} for ${resource.type}.${resource.name}: ${defaultValue}`);
        }
      }
    }

    return {
      config: mocked,
      mocked: { attributes: mockedAttributes }
    };
  }

  /**
   * Generate mocking report for all resources
   */
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
        report.mockedAttributes[`${resource.type}.${resource.name}`] = resource.mocked.attributes;
      }
    }

    if (report.mockedResources > 0) {
      report.warnings.push(
        `${report.mockedResources} resources had attributes mocked due to missing values. ` +
        `Provide complete Terraform configuration or variable defaults for accurate pricing.`
      );
    }

    return report;
  }
}