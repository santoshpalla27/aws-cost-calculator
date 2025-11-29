import logger from '../config/logger.config.js';

export class DataMockerService {
  shouldMockValue(resourceType, attributeName, currentValue) {
    // Don't mock if we have a real value
    if (currentValue !== undefined && 
        currentValue !== null && 
        currentValue !== '') {
      
      // Check if it's an unresolved variable reference
      if (typeof currentValue === 'string') {
        // If it's still a ${var.xxx} reference, it should be mocked
        if (currentValue.match(/^\$\{var\.[^}]+\}$/)) {
          return this.isRequiredForCosting(resourceType, attributeName);
        }
        // If it looks like a real value, don't mock
        return false;
      }
      return false;
    }

    return this.isRequiredForCosting(resourceType, attributeName);
  }

  isUnresolvedReference(value) {
    if (typeof value !== 'string') return false;
    if (value === '') return true;
    
    // Check for unresolved Terraform references
    const patterns = [
      /^\$\{var\./,
      /^\$\{data\./,
      /^\$\{local\./,
      /^\$\{module\./,
      /^\$\{aws_/
    ];

    return patterns.some(pattern => pattern.test(value));
  }

  isRequiredForCosting(resourceType, attributeName) {
    const costingAttributes = {
      'aws_instance': ['instance_type'],
      'aws_db_instance': ['instance_class', 'engine'],
      'aws_ebs_volume': ['size', 'type'],
      'aws_elasticache_cluster': ['node_type'],
      'aws_elasticache_replication_group': ['node_type'],
      'aws_launch_template': ['instance_type']
    };

    const required = costingAttributes[resourceType] || [];
    return required.includes(attributeName);
  }

  mockResourceConfig(resource) {
    const mocked = { ...resource.config };
    const hasMocked = { attributes: [] };

    // Only mock cost-critical attributes
    switch (resource.type) {
      case 'aws_instance':
        if (this.shouldMockValue('aws_instance', 'instance_type', mocked.instance_type)) {
          mocked.instance_type = 't3.small';
          hasMocked.attributes.push('instance_type');
          logger.warn(`Mocked instance_type for ${resource.name}: t3.small`);
        }
        break;

      case 'aws_db_instance':
        if (this.shouldMockValue('aws_db_instance', 'instance_class', mocked.instance_class)) {
          mocked.instance_class = 'db.t3.micro';
          hasMocked.attributes.push('instance_class');
          logger.warn(`Mocked instance_class for ${resource.name}: db.t3.micro`);
        }
        if (this.shouldMockValue('aws_db_instance', 'engine', mocked.engine)) {
          mocked.engine = 'mysql';
          hasMocked.attributes.push('engine');
          logger.warn(`Mocked engine for ${resource.name}: mysql`);
        }
        break;

      case 'aws_ebs_volume':
        if (this.shouldMockValue('aws_ebs_volume', 'size', mocked.size)) {
          mocked.size = 10;
          hasMocked.attributes.push('size');
        }
        if (this.shouldMockValue('aws_ebs_volume', 'type', mocked.type)) {
          mocked.type = 'gp3';
          hasMocked.attributes.push('type');
        }
        break;

      case 'aws_elasticache_cluster':
      case 'aws_elasticache_replication_group':
        if (this.shouldMockValue(resource.type, 'node_type', mocked.node_type)) {
          mocked.node_type = 'cache.t3.micro';
          hasMocked.attributes.push('node_type');
        }
        break;

      case 'aws_launch_template':
        if (this.shouldMockValue('aws_launch_template', 'instance_type', mocked.instance_type)) {
          mocked.instance_type = 't3.small';
          hasMocked.attributes.push('instance_type');
        }
        break;
    }

    return { config: mocked, mocked: hasMocked };
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
        `${report.mockedResources} resources had minimal attributes mocked (${Object.keys(report.mockedAttributes).length} total). ` +
        `Provide complete Terraform configuration for 100% accuracy.`
      );
    }

    return report;
  }
}