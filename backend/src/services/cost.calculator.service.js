import { initializePricingServices, pricingRegistry } from './pricing/index.js';
import logger from '../config/logger.config.js';

export class CostCalculatorService {
  constructor(awsClientFactory) {
    this.awsClientFactory = awsClientFactory;
    this.registry = initializePricingServices(awsClientFactory);
    this.launchTemplates = new Map();
  }

  async calculateTotalCost(resources, region = 'us-east-1') {
    const costBreakdown = {
      resources: [],
      summary: { hourly: 0, daily: 0, monthly: 0, yearly: 0 },
      byService: {},
      byCategory: {},
      region,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      unsupportedResources: [],
      errors: []
    };

    // Pre-process launch templates
    for (const resource of resources) {
      if (resource.type === 'aws_launch_template') {
        this.launchTemplates.set(resource.name, resource.config);
      }
    }

    // Resolve launch template references for ASGs
    for (const resource of resources) {
      if (resource.type === 'aws_autoscaling_group') {
        this.resolveASGLaunchTemplate(resource);
      }
    }

    logger.info(`Calculating costs for ${resources.length} resources...`);

    for (const resource of resources) {
      try {
        if (!this.registry.isSupported(resource.type)) {
          costBreakdown.unsupportedResources.push({
            type: resource.type,
            name: resource.name
          });
          continue;
        }

        const cost = await this.registry.calculateCost(resource, region);

        if (cost && cost.hourly > 0) {
          const resourceCost = {
            type: resource.type,
            name: resource.name,
            module: resource.module,
            ...cost
          };

          costBreakdown.resources.push(resourceCost);
          costBreakdown.summary.hourly += cost.hourly;

          // Group by service
          const service = this.getServiceFromResourceType(resource.type);
          if (!costBreakdown.byService[service]) {
            costBreakdown.byService[service] = { hourly: 0, resources: 0 };
          }
          costBreakdown.byService[service].hourly += cost.hourly;
          costBreakdown.byService[service].resources += 1;

          // Group by category
          const category = this.getCategoryFromResourceType(resource.type);
          if (!costBreakdown.byCategory[category]) {
            costBreakdown.byCategory[category] = { hourly: 0, resources: 0 };
          }
          costBreakdown.byCategory[category].hourly += cost.hourly;
          costBreakdown.byCategory[category].resources += 1;

          logger.info(`Cost for ${resource.type}.${resource.name}: $${cost.hourly.toFixed(4)}/hr ($${(cost.hourly * 730).toFixed(2)}/month)`);
        }
      } catch (error) {
        logger.error(`Error calculating cost for ${resource.type}.${resource.name}:`, error);
        costBreakdown.errors.push({
          resource: `${resource.type}.${resource.name}`,
          error: error.message
        });
      }
    }

    // Calculate summary totals
    costBreakdown.summary.daily = costBreakdown.summary.hourly * 24;
    costBreakdown.summary.monthly = costBreakdown.summary.hourly * 730;
    costBreakdown.summary.yearly = costBreakdown.summary.hourly * 8760;

    // Convert by-service and by-category hourly to monthly
    for (const service of Object.keys(costBreakdown.byService)) {
      costBreakdown.byService[service].monthly = costBreakdown.byService[service].hourly * 730;
    }
    for (const category of Object.keys(costBreakdown.byCategory)) {
      costBreakdown.byCategory[category].monthly = costBreakdown.byCategory[category].hourly * 730;
    }

    logger.info(`Total cost: $${costBreakdown.summary.hourly.toFixed(4)}/hr ($${costBreakdown.summary.monthly.toFixed(2)}/month)`);
    logger.info(`Unsupported resources: ${costBreakdown.unsupportedResources.length}`);

    return costBreakdown;
  }

  resolveASGLaunchTemplate(resource) {
    const config = resource.config;
    
    // Check launch_template
    if (config.launch_template) {
      const ltRef = Array.isArray(config.launch_template) 
        ? config.launch_template[0] 
        : config.launch_template;
      const ltMatch = String(ltRef.id || '').match(/aws_launch_template\.([^.]+)/);
      if (ltMatch) {
        const template = this.launchTemplates.get(ltMatch[1]);
        if (template) {
          config._resolved_launch_template = template;
        }
      }
    }

    // Check mixed_instances_policy
    if (config.mixed_instances_policy) {
      const mip = Array.isArray(config.mixed_instances_policy)
        ? config.mixed_instances_policy[0]
        : config.mixed_instances_policy;
      
      if (mip.launch_template) {
        const lt = Array.isArray(mip.launch_template) ? mip.launch_template[0] : mip.launch_template;
        if (lt.launch_template_specification) {
          const lts = Array.isArray(lt.launch_template_specification)
            ? lt.launch_template_specification[0]
            : lt.launch_template_specification;
          
          const ltMatch = String(lts.launch_template_id || '').match(/aws_launch_template\.([^.]+)/);
          if (ltMatch) {
            const template = this.launchTemplates.get(ltMatch[1]);
            if (template) {
              config._resolved_launch_template = template;
            }
          }
        }
      }
    }
  }

  getServiceFromResourceType(resourceType) {
    const serviceMap = {
      'aws_instance': 'EC2',
      'aws_autoscaling_group': 'EC2',
      'aws_launch_template': 'EC2',
      'aws_ebs_volume': 'EC2',
      'aws_lambda_function': 'Lambda',
      'aws_ecs_': 'ECS',
      'aws_eks_': 'EKS',
      'aws_rds_': 'RDS',
      'aws_db_': 'RDS',
      'aws_dynamodb_': 'DynamoDB',
      'aws_elasticache_': 'ElastiCache',
      'aws_s3_': 'S3',
      'aws_efs_': 'EFS',
      'aws_lb': 'ELB',
      'aws_alb': 'ELB',
      'aws_nat_gateway': 'VPC',
      'aws_vpc': 'VPC',
      'aws_cloudfront_': 'CloudFront',
      'aws_route53_': 'Route53',
      'aws_api_gateway': 'APIGateway',
      'aws_apigateway': 'APIGateway',
      'aws_sqs_': 'SQS',
      'aws_sns_': 'SNS',
      'aws_cloudwatch_': 'CloudWatch',
      'aws_kms_': 'KMS',
      'aws_secretsmanager_': 'SecretsManager',
      'aws_waf': 'WAF',
      'aws_codebuild_': 'CodeBuild',
      'aws_codepipeline': 'CodePipeline',
      'aws_sfn_': 'StepFunctions'
    };

    for (const [prefix, service] of Object.entries(serviceMap)) {
      if (resourceType.startsWith(prefix)) {
        return service;
      }
    }
    return 'Other';
  }

  getCategoryFromResourceType(resourceType) {
    const categoryMap = {
      'Compute': ['aws_instance', 'aws_autoscaling_', 'aws_launch_', 'aws_lambda_', 'aws_ecs_', 'aws_eks_'],
      'Storage': ['aws_s3_', 'aws_ebs_', 'aws_efs_'],
      'Database': ['aws_db_', 'aws_rds_', 'aws_dynamodb_', 'aws_elasticache_'],
      'Networking': ['aws_vpc', 'aws_subnet', 'aws_nat_', 'aws_lb', 'aws_alb', 'aws_nlb', 'aws_cloudfront_', 'aws_route53_', 'aws_api_gateway'],
      'Security': ['aws_waf', 'aws_shield_', 'aws_kms_', 'aws_secretsmanager_', 'aws_ssm_'],
      'Messaging': ['aws_sqs_', 'aws_sns_', 'aws_msk_', 'aws_cloudwatch_event'],
      'Monitoring': ['aws_cloudwatch_', 'aws_cloudtrail', 'aws_xray_'],
      'DevOps': ['aws_codepipeline', 'aws_codebuild_', 'aws_codedeploy_', 'aws_sfn_']
    };

    for (const [category, prefixes] of Object.entries(categoryMap)) {
      for (const prefix of prefixes) {
        if (resourceType.startsWith(prefix)) {
          return category;
        }
      }
    }
    return 'Other';
  }

  formatCostSummary(costBreakdown) {
    return {
      summary: {
        hourly: `$${costBreakdown.summary.hourly.toFixed(4)}`,
        daily: `$${costBreakdown.summary.daily.toFixed(2)}`,
        monthly: `$${costBreakdown.summary.monthly.toFixed(2)}`,
        yearly: `$${costBreakdown.summary.yearly.toFixed(2)}`
      },
      byService: Object.fromEntries(
        Object.entries(costBreakdown.byService).map(([k, v]) => [k, `$${v.monthly.toFixed(2)}/month`])
      ),
      byCategory: Object.fromEntries(
        Object.entries(costBreakdown.byCategory).map(([k, v]) => [k, `$${v.monthly.toFixed(2)}/month`])
      ),
      resourceCount: costBreakdown.resources.length,
      unsupportedCount: costBreakdown.unsupportedResources.length,
      region: costBreakdown.region,
      currency: costBreakdown.currency,
      timestamp: costBreakdown.timestamp
    };
  }
}