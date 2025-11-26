import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import { AWSConfig } from '../config/aws';
import { RedisCache } from '../cache/redisCache';
import { logger } from '../utils/logger';

export interface RDSCalculationRequest {
    engine: string;
    instanceClass: string;
    region: string;
    storageType: string;
    storageSize: number;
    multiAZ: boolean;
    backupStorage: number;
    awsAccessKey: string;
    awsSecretKey: string;
}

export interface RDSCalculationResult {
    instanceCost: {
        hourly: number;
        monthly: number;
    };
    storageCost: {
        monthly: number;
    };
    backupCost: {
        monthly: number;
    };
    totalMonthlyCost: number;
    totalHourlyCost: number;
    breakdown: any;
}

export class RDSPricingService {
    private cache: RedisCache;

    constructor() {
        this.cache = new RedisCache();
    }

    async calculateRDSCost(request: RDSCalculationRequest): Promise {
        try {
            logger.info('Calculating RDS costs', {
                instanceClass: request.instanceClass,
                engine: request.engine
            });

            const cacheKey = this.generateCacheKey(request);
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // Get instance pricing
            const instancePrice = await this.getInstancePrice(
                request.engine,
                request.instanceClass,
                request.region,
                request.multiAZ,
                request.awsAccessKey,
                request.awsSecretKey
            );

            // Calculate storage cost
            const storagePricing: { [key: string]: number } = {
                'gp2': 0.115,
                'gp3': 0.10,
                'io1': 0.125,
                'magnetic': 0.10
            };

            const storagePrice = storagePricing[request.storageType] || 0.115;
            const storageCost = request.storageSize * storagePrice;

            // Backup storage cost (\$0.095 per GB-month)
            const backupCost = request.backupStorage * 0.095;

            const instanceHourlyCost = instancePrice;
            const instanceMonthlyCost = instanceHourlyCost * 730; // 730 hours per month
            const totalMonthlyCost = instanceMonthlyCost + storageCost + backupCost;
            const totalHourlyCost = totalMonthlyCost / 730;

            const result: RDSCalculationResult = {
                instanceCost: {
                    hourly: parseFloat(instanceHourlyCost.toFixed(4)),
                    monthly: parseFloat(instanceMonthlyCost.toFixed(2))
                },
                storageCost: {
                    monthly: parseFloat(storageCost.toFixed(2))
                },
                backupCost: {
                    monthly: parseFloat(backupCost.toFixed(2))
                },
                totalMonthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
                totalHourlyCost: parseFloat(totalHourlyCost.toFixed(4)),
                breakdown: {
                    engine: request.engine,
                    instanceClass: request.instanceClass,
                    region: request.region,
                    multiAZ: request.multiAZ,
                    storageType: request.storageType,
                    storageSize: request.storageSize
                }
            };

            await this.cache.set(cacheKey, JSON.stringify(result), 3600);

            return result;

        } catch (error) {
            logger.error('Error calculating RDS costs:', error);
            throw error;
        }
    }

    private async getInstancePrice(
        engine: string,
        instanceClass: string,
        region: string,
        multiAZ: boolean,
        accessKeyId: string,
        secretAccessKey: string
    ): Promise {
        // Default pricing fallback
        const defaultPrices: { [key: string]: number } = {
            'db.t3.micro': 0.017,
            'db.t3.small': 0.034,
            'db.t3.medium': 0.068,
            'db.t3.large': 0.136,
            'db.m5.large': 0.192,
            'db.m5.xlarge': 0.384,
            'db.r5.large': 0.29
        };

        let basePrice = defaultPrices[instanceClass] || 0.10;

        // Multi-AZ doubles the cost
        if (multiAZ) {
            basePrice *= 2;
        }

        return basePrice;
    }

    private generateCacheKey(request: RDSCalculationRequest): string {
        return `rds:\${request.engine}:\${request.instanceClass}:\${request.region}:\${request.multiAZ}`;
    }
}