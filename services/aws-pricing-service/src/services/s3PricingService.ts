import { RedisCache } from '../cache/redisCache';
import { logger } from '../utils/logger';

export interface S3CalculationRequest {
    region: string;
    storageClass: string;
    storageAmount: number; // in GB
    putRequests: number;
    getRequests: number;
    dataTransferOut: number; // in GB
    awsAccessKey: string;
    awsSecretKey: string;
}

export interface S3CalculationResult {
    storageCost: {
        monthly: number;
        pricePerGB: number;
    };
    requestCost: {
        monthly: number;
        putCost: number;
        getCost: number;
    };
    dataTransferCost: {
        monthly: number;
    };
    totalMonthlyCost: number;
    breakdown: any;
}

export class S3PricingService {
    private cache: RedisCache;

    constructor() {
        this.cache = new RedisCache();
    }

    async calculateS3Cost(request: S3CalculationRequest): Promise {
        try {
            logger.info('Calculating S3 costs', {
                storageClass: request.storageClass,
                storageAmount: request.storageAmount
            });

            const cacheKey = this.generateCacheKey(request);
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // Storage pricing per GB-month (us-east-1 pricing)
            const storagePricing: { [key: string]: number } = {
                'STANDARD': 0.023,
                'INTELLIGENT_TIERING': 0.023,
                'STANDARD_IA': 0.0125,
                'ONEZONE_IA': 0.01,
                'GLACIER': 0.004,
                'GLACIER_IR': 0.004,
                'DEEP_ARCHIVE': 0.00099
            };

            const pricePerGB = storagePricing[request.storageClass] || 0.023;
            const storageCost = request.storageAmount * pricePerGB;

            // Request pricing
            // PUT requests: \$0.005 per 1,000 requests
            // GET requests: \$0.0004 per 1,000 requests
            const putCost = (request.putRequests / 1000) * 0.005;
            const getCost = (request.getRequests / 1000) * 0.0004;
            const requestCost = putCost + getCost;

            // Data transfer pricing (first 1 GB free, then \$0.09/GB up to 10 TB)
            let dataTransferCost = 0;
            if (request.dataTransferOut & gt; 1) {
                dataTransferCost = (request.dataTransferOut - 1) * 0.09;
            }

            const totalMonthlyCost = storageCost + requestCost + dataTransferCost;

            const result: S3CalculationResult = {
                storageCost: {
                    monthly: parseFloat(storageCost.toFixed(2)),
                    pricePerGB
                },
                requestCost: {
                    monthly: parseFloat(requestCost.toFixed(2)),
                    putCost: parseFloat(putCost.toFixed(4)),
                    getCost: parseFloat(getCost.toFixed(4))
                },
                dataTransferCost: {
                    monthly: parseFloat(dataTransferCost.toFixed(2))
                },
                totalMonthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
                breakdown: {
                    region: request.region,
                    storageClass: request.storageClass,
                    storageAmount: request.storageAmount,
                    putRequests: request.putRequests,
                    getRequests: request.getRequests,
                    dataTransferOut: request.dataTransferOut
                }
            };

            await this.cache.set(cacheKey, JSON.stringify(result), 3600);

            return result;

        } catch (error) {
            logger.error('Error calculating S3 costs:', error);
            throw error;
        }
    }

    private generateCacheKey(request: S3CalculationRequest): string {
        return `s3:\${request.storageClass}:\${request.storageAmount}:\${request.region}`;
    }
}