import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class EKSPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'EKS');
  }

  getServiceCode() {
    return 'AmazonEKS';
  }

  getSupportedResourceTypes() {
    return [
      'aws_eks_cluster',
      'aws_eks_node_group',
      'aws_eks_fargate_profile',
      'aws_eks_addon'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_eks_cluster':
        return this.calculateClusterCost(resource, region);
      case 'aws_eks_node_group':
        return this.calculateNodeGroupCost(resource, region);
      case 'aws_eks_fargate_profile':
        return this.calculateFargateProfileCost(resource, region);
      default:
        return null;
    }
  }

  async calculateClusterCost(resource, region) {
    // EKS cluster: $0.10 per hour
    const clusterCost = 0.10;

    return this.formatCostResponse(clusterCost, {
      cluster: clusterCost
    }, {
      region,
      note: 'EKS cluster control plane cost. Node costs are separate.'
    });
  }

  async calculateNodeGroupCost(resource, region) {
    const config = resource.config;
    const desiredSize = config.scaling_config?.[0]?.desired_size || 
                       config.scaling_config?.desired_size || 2;
    const instanceTypes = config.instance_types || ['t3.medium'];
    const instanceType = instanceTypes[0];
    
    // Get EC2 pricing for the instance type
    const instancePricing = await this.getEC2Pricing(instanceType, region);
    const computeCost = instancePricing * desiredSize;
    
    // EBS storage for nodes
    const diskSize = config.disk_size || 20;
    const ebsPricing = await this.getEBSPricing(region);
    const storageCost = this.monthlyToHourly(ebsPricing * diskSize * desiredSize);
    
    const totalHourly = computeCost + storageCost;

    return this.formatCostResponse(totalHourly, {
      compute: computeCost,
      storage: storageCost
    }, {
      instanceType,
      desiredSize,
      diskSize,
      minSize: config.scaling_config?.[0]?.min_size,
      maxSize: config.scaling_config?.[0]?.max_size
    });
  }

  async calculateFargateProfileCost(resource, region) {
    // Fargate profile itself is free
    // Costs come from pods running on Fargate
    // Estimate based on assumed pod configuration
    const config = resource.config;
    
    // Assume some pods will run on this profile
    const estimatedPods = config._estimated_pods || 2;
    const cpuPerPod = 0.25; // 0.25 vCPU
    const memoryPerPod = 0.5; // 0.5 GB
    
    const pricing = await this.getFargatePricing(region);
    const cpuCost = cpuPerPod * pricing.cpuPrice * estimatedPods;
    const memoryCost = memoryPerPod * pricing.memoryPrice * estimatedPods;
    
    const hourly = cpuCost + memoryCost;

    return this.formatCostResponse(hourly, {
      cpu: cpuCost,
      memory: memoryCost
    }, {
      estimatedPods,
      note: 'Fargate profile cost depends on actual pod usage. This is an estimate.'
    });
  }

  async getEC2Pricing(instanceType, region) {
    // Reuse EC2 pricing logic
    const cacheKey = `ec2-${instanceType}-${region}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const fallback = {
      't3.micro': 0.0104,
      't3.small': 0.0208,
      't3.medium': 0.0416,
      't3.large': 0.0832,
      'm5.large': 0.096,
      'm5.xlarge': 0.192
    };
    
    return fallback[instanceType] || 0.0416;
  }

  async getEBSPricing(region) {
    return 0.10; // $0.10 per GB-month for gp2
  }

  async getFargatePricing(region) {
    return {
      cpuPrice: 0.04048,
      memoryPrice: 0.004445
    };
  }
}