import { PricingClient, GetProductsCommand } from '@aws-sdk/client-pricing';
import { AWSConfig } from '../config/aws';
import { RedisCache } from '../cache/redisCache';
import { logger } from '../utils/logger';

export interface EC2CalculationRequest {
    instanceType: string;
    region: string;
    osType: string;
    tenancy: string;
    pricingModel: string;
    ebsVolumes: Array & lt;{
    type: string;
    size: number;
    iops ?: number;
}& gt;;
quantity: number;
hoursPerMonth: number;
awsAccessKey: string;
awsSecretKey: string;
}

export interface EC2CalculationResult {
    instanceCost: {
        hourly: number;
        monthly: number;
        unit: string;
    };
    ebsCost: {
        monthly: number;
        breakdown: Array & lt;{
    type: string;
    size: number;
    cost: number;
}& gt;;
  };
totalMonthlyCost: number;
totalHourlyCost: number;
breakdown: any;
}

export class EC2PricingService {
    private cache: RedisCache;

    constructor() {
        this.cache = new RedisCache();
    }

    async calculateEC2Cost(request: EC2CalculationRequest): Promise<span><span style="color: rgb(150, 34, 73); font-weight: bold;" >& lt; ec2calculationresult & gt; </span><span style="color: black; font-weight: normal;"> {
try {
    logger.info('Calculating EC2 costs', {
        instanceType: request.instanceType,
        region: request.region
    });

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
        logger.info('Returning cached EC2 pricing');
        return JSON.parse(cached);
    }

    // Get instance pricing
    const instancePrice = await this.getInstancePrice(
        request.instanceType,
        request.region,
        request.osType,
        request.tenancy,
        request.pricingModel,
        request.awsAccessKey,
        request.awsSecretKey
    );

    // Get EBS pricing
    const ebsCost = await this.calculateEBSCost(
        request.ebsVolumes,
        request.region,
        request.awsAccessKey,
        request.awsSecretKey
    );

    const instanceHourlyCost = instancePrice * request.quantity;
    const instanceMonthlyCost = instanceHourlyCost * request.hoursPerMonth;
    const totalMonthlyCost = instanceMonthlyCost + ebsCost.monthly;
    const totalHourlyCost = instanceHourlyCost + (ebsCost.monthly / request.hoursPerMonth);

    const result: EC2CalculationResult = {
        instanceCost: {
            hourly: instanceHourlyCost,
            monthly: instanceMonthlyCost,
            unit: 'USD'
        },
        ebsCost,
        totalMonthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
        totalHourlyCost: parseFloat(totalHourlyCost.toFixed(4)),
        breakdown: {
            instanceType: request.instanceType,
            quantity: request.quantity,
            osType: request.osType,
            region: request.region,
            hoursPerMonth: request.hoursPerMonth,
            pricePerHour: instancePrice
        }
    };

    // Cache result
    await this.cache.set(cacheKey, JSON.stringify(result), 3600);

    logger.info('EC2 cost calculation completed', {
        totalMonthlyCost: result.totalMonthlyCost
    });

    return result;

} catch (error) {
    logger.error('Error calculating EC2 costs:', error);
    throw error;
}
  }

  private async getInstancePrice(
    instanceType: string,
    region: string,
    osType: string,
    tenancy: string,
    pricingModel: string,
    accessKeyId: string,
    secretAccessKey: string
): Promise {
    try {
        const client = AWSConfig.createPricingClient(accessKeyId, secretAccessKey);

        // Map region code to location name
        const locationMap: { [key: string]: string } = {
            'us-east-1': 'US East (N. Virginia)',
            'us-east-2': 'US East (Ohio)',
            'us-west-1': 'US West (N. California)',
            'us-west-2': 'US West (Oregon)',
            'eu-west-1': 'EU (Ireland)',
            'eu-central-1': 'EU (Frankfurt)',
            'ap-southeast-1': 'Asia Pacific (Singapore)',
            'ap-northeast-1': 'Asia Pacific (Tokyo)'
        };

        const location = locationMap[region] || 'US East (N. Virginia)';

        const filters = [
            {
                Type: 'TERM_MATCH',
                Field: 'instanceType',
                Value: instanceType
            },
            {
                Type: 'TERM_MATCH',
                Field: 'location',
                Value: location
            },
            {
                Type: 'TERM_MATCH',
                Field: 'operatingSystem',
                Value: osType
            },
            {
                Type: 'TERM_MATCH',
                Field: 'tenancy',
                Value: tenancy
            },
            {
                Type: 'TERM_MATCH',
                Field: 'preInstalledSw',
                Value: 'NA'
            },
            {
                Type: 'TERM_MATCH',
                Field: 'capacitystatus',
                Value: 'Used'
            }
        ];

        const command = new GetProductsCommand({
            ServiceCode: 'AmazonEC2',
            Filters: filters,
            MaxResults: 1
        });

        const response = await client.send(command);

        if (!response.PriceList || response.PriceList.length === 0) {
            logger.warn('No pricing found, using default estimate');
            return this.getDefaultPrice(instanceType);
        }

        const priceData = JSON.parse(response.PriceList[0]);
        const terms = pricingModel === 'OnDemand'
            ? priceData.terms.OnDemand
            : priceData.terms.Reserved;

        const termKey = Object.keys(terms)[0];
        const priceDimensions = terms[termKey].priceDimensions;
        const dimensionKey = Object.keys(priceDimensions)[0];
        const pricePerUnit = parseFloat(priceDimensions[dimensionKey].pricePerUnit.USD);

        return pricePerUnit;

    } catch (error) {
        logger.error('Error fetching instance price from AWS:', error);
        return this.getDefaultPrice(instanceType);
    }
}

  private async calculateEBSCost(
    volumes: Array & lt; { type: string; size: number; iops ?: number }& gt;,
region: string,
    accessKeyId: string,
        secretAccessKey: string
  ): Promise & lt; { monthly: number; breakdown: Array & lt; { type: string; size: number; cost: number }& gt; }& gt; {
    let totalCost = 0;
    const breakdown = [];

    // EBS pricing per GB-month (approximate)
    const ebsPricing: { [key: string]: number } = {
        'gp2': 0.10,
        'gp3': 0.08,
        'io1': 0.125,
        'io2': 0.125,
        'st1': 0.045,
        'sc1': 0.025
    };

    for (const volume of volumes) {
        const pricePerGB = ebsPricing[volume.type] || 0.10;
        let volumeCost = volume.size * pricePerGB;

        // Add IOPS cost for io1/io2
        if ((volume.type === 'io1' || volume.type === 'io2') & amp;& amp; volume.iops) {
            volumeCost += volume.iops * 0.065; // \$0.065 per provisioned IOPS
        }

        totalCost += volumeCost;
        breakdown.push({
            type: volume.type,
            size: volume.size,
            cost: parseFloat(volumeCost.toFixed(2))
        });
    }

    return {
        monthly: parseFloat(totalCost.toFixed(2)),
        breakdown
    };
}

  private getDefaultPrice(instanceType: string): number {
    // Fallback pricing estimates
    const defaultPrices: { [key: string]: number } = {
        't2.micro': 0.0116,
        't2.small': 0.023,
        't2.medium': 0.0464,
        't3.micro': 0.0104,
        't3.small': 0.0208,
        't3.medium': 0.0416,
        't3.large': 0.0832,
        'm5.large': 0.096,
        'm5.xlarge': 0.192,
        'm5.2xlarge': 0.384,
        'c5.large': 0.085,
        'r5.large': 0.126
    };

    return defaultPrices[instanceType] || 0.10;
}

  private generateCacheKey(request: EC2CalculationRequest): string {
    return `ec2:\${request.instanceType}:\${request.region}:\${request.osType}:\${request.tenancy}:\${request.pricingModel}`;
}
}