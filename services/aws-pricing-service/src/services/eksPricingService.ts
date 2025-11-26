import { RedisCache } from '../cache/redisCache';
import { logger } from '../utils/logger';

export interface EKSCalculationRequest {
    region: string;
    clusterCount: number;
    nodeGroups: Array & lt;{
    instanceType: string;
    nodeCount: number;
    storageSize: number;
}& gt;;
fargateVCPU: number;
fargateMemoryGB: number;
awsAccessKey: string;
awsSecretKey: string;
}

export interface EKSCalculationResult {
    clusterCost: {
        monthly: number;
        hourly: number;
    };
    nodeGroupsCost: {
        monthly: number;
        breakdown: Array & lt;{
    instanceType: string;
    nodeCount: number;
    monthlyCost: number;
}& gt;;
  };
fargateCost: {
    monthly: number;
};
totalMonthlyCost: number;
totalHourlyCost: number;
breakdown: any;
}

export class EKSPricingService {
    private cache: RedisCache;

    constructor() {
        this.cache = new RedisCache();
    }

    async calculateEKSCost(request: EKSCalculationRequest): Promise {
        try {
            logger.info('Calculating EKS costs', {
                clusterCount: request.clusterCount,
                nodeGroups: request.nodeGroups.length
            });

            const cacheKey = this.generateCacheKey(request);
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // EKS cluster cost: \$0.10 per hour per cluster
            const clusterHourlyCost = 0.10 * request.clusterCount;
            const clusterMonthlyCost = clusterHourlyCost * 730;

            // Calculate node groups cost
            let nodeGroupsTotal = 0;
            const nodeGroupsBreakdown = [];

            const ec2Pricing: { [key: string]: number } = {
                't3.medium': 0.0416,
                't3.large': 0.0832,
                't3.xlarge': 0.1664,
                'm5.large': 0.096,
                'm5.xlarge': 0.192,
                'm5.2xlarge': 0.384,
                'c5.large': 0.085,
                'c5.xlarge': 0.17
            };

            for (const nodeGroup of request.nodeGroups) {
                const instancePrice = ec2Pricing[nodeGroup.instanceType] || 0.10;
                const nodeGroupMonthlyCost = instancePrice * 730 * nodeGroup.nodeCount;

                // Add EBS cost
                const ebsCost = nodeGroup.storageSize * 0.10 * nodeGroup.nodeCount;

                const totalNodeGroupCost = nodeGroupMonthlyCost + ebsCost;
                nodeGroupsTotal += totalNodeGroupCost;

                nodeGroupsBreakdown.push({
                    instanceType: nodeGroup.instanceType,
                    nodeCount: nodeGroup.nodeCount,
                    monthlyCost: parseFloat(totalNodeGroupCost.toFixed(2))
                });
            }

            // Fargate pricing
            // \$0.04048 per vCPU per hour
            // \$0.004445 per GB per hour
            const fargateVCPUCost = request.fargateVCPU * 0.04048 * 730;
            const fargateMemoryCost = request.fargateMemoryGB * 0.004445 * 730;
            const fargateTotalCost = fargateVCPUCost + fargateMemoryCost;

            const totalMonthlyCost = clusterMonthlyCost + nodeGroupsTotal + fargateTotalCost;
            const totalHourlyCost = totalMonthlyCost / 730;

            const result: EKSCalculationResult = {
                clusterCost: {
                    monthly: parseFloat(clusterMonthlyCost.toFixed(2)),
                    hourly: parseFloat(clusterHourlyCost.toFixed(4))
                },
                nodeGroupsCost: {
                    monthly: parseFloat(nodeGroupsTotal.toFixed(2)),
                    breakdown: nodeGroupsBreakdown
                },
                fargateCost: {
                    monthly: parseFloat(fargateTotalCost.toFixed(2))
                },
                totalMonthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
                totalHourlyCost: parseFloat(totalHourlyCost.toFixed(4)),
                breakdown: {
                    region: request.region,
                    clusterCount: request.clusterCount,
                    nodeGroupCount: request.nodeGroups.length,
                    fargateVCPU: request.fargateVCPU,
                    fargateMemoryGB: request.fargateMemoryGB
                }
            };

            await this.cache.set(cacheKey, JSON.stringify(result), 3600);

            return result;

        } catch (error) {
            logger.error('Error calculating EKS costs:', error);
            throw error;
        }
    }

    private generateCacheKey(request: EKSCalculationRequest): string {
        return `eks:\${request.region}:\${request.clusterCount}:\${JSON.stringify(request.nodeGroups)}`;
    }
}