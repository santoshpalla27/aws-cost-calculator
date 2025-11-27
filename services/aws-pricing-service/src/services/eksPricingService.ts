import { pricing } from '../config/aws';
import { logger } from '../utils/logger';
import { PriceCalculator } from '../utils/priceCalculator';

export interface EKSNodeGroup {
  instanceType: string;
  nodeCount: number;
  hourlyHours: number;
}

export interface EKSCostRequest {
  region: string;
  nodeGroups: EKSNodeGroup[];
}

export interface EKSCostResult {
  monthlyCost: number;
  breakdown: {
    clusterCost: number;
    nodeGroupCosts: Array<{
      instanceType: string;
      nodeCount: number;
      monthlyCost: number;
    }>;
    addonCosts: number;
  };
}

export class EKSPricingService {
  private priceCalculator: PriceCalculator;

  constructor() {
    this.priceCalculator = new PriceCalculator();
  }

  async calculateEKSCost(
    region: string = 'us-east-1',
    nodeGroups: EKSNodeGroup[]
  ): Promise<EKSCostResult> {
    try {
      // EKS cluster cost is $0.10 per hour (as of 2023)
      const clusterHourlyCost = 0.10;
      const clusterMonthlyCost = clusterHourlyCost * 730; // 730 hours in a month

      // Calculate node group costs
      let totalNodeGroupCost = 0;
      const nodeGroupCosts = [];

      for (const nodeGroup of nodeGroups) {
        const nodeHourlyCost = await this.getInstanceCost(nodeGroup.instanceType, region);
        const nodeGroupMonthlyCost = nodeHourlyCost * nodeGroup.nodeCount * nodeGroup.hourlyHours;
        
        totalNodeGroupCost += nodeGroupMonthlyCost;
        
        nodeGroupCosts.push({
          instanceType: nodeGroup.instanceType,
          nodeCount: nodeGroup.nodeCount,
          monthlyCost: parseFloat(nodeGroupMonthlyCost.toFixed(2))
        });
      }

      // Calculate addon costs (simplified)
      const addonMonthlyCost = 0; // Would include costs for VPC CNI, CoreDNS, kube-proxy in a real implementation

      // Calculate total cost
      const totalMonthlyCost = clusterMonthlyCost + totalNodeGroupCost + addonMonthlyCost;

      return {
        monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
        breakdown: {
          clusterCost: parseFloat(clusterMonthlyCost.toFixed(2)),
          nodeGroupCosts,
          addonCosts: parseFloat(addonMonthlyCost.toFixed(2))
        }
      };
    } catch (error) {
      logger.error('Error calculating EKS cost:', error);
      throw error;
    }
  }

  private async getInstanceCost(
    instanceType: string,
    region: string
  ): Promise<number> {
    // This is a simplified implementation similar to EC2 pricing
    // In a real system, this would query the AWS Pricing API
    const priceMap: { [key: string]: number } = {
      // Sample pricing data (these are illustrative, not real prices)
      't3.micro': 0.0116,
      't3.small': 0.0232,
      't3.medium': 0.0464,
      't3.large': 0.0928,
      'm5.large': 0.096,
      'm5.xlarge': 0.192,
      'm5.2xlarge': 0.384,
      'c5.large': 0.085,
      'c5.xlarge': 0.17,
      'c5.2xlarge': 0.34,
      'r5.large': 0.126,
      'r5.xlarge': 0.252,
      'r5.2xlarge': 0.504,
    };

    // Determine the base price based on instance type
    const basePrice = priceMap[instanceType] || 0.1; // Default to $0.10/hr if not found
    
    // Adjust based on region
    const regionMultiplier = region.startsWith('us-') ? 1.0 : 1.1;
    
    return basePrice * regionMultiplier;
  }
}