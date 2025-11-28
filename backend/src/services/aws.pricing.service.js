import { 
  GetProductsCommand,
  PricingClient 
} from '@aws-sdk/client-pricing';
import logger from '../config/logger.config.js';

export class AWSPricingService {
  constructor(awsClientFactory) {
    this.clientFactory = awsClientFactory;
    this.cache = new Map();
    this.cacheExpiry = 86400000; // 24 hours
  }

  async getEC2Pricing(instanceType, region, operatingSystem = 'Linux', tenancy = 'Shared') {
    const cacheKey = `ec2-${instanceType}-${region}-${operatingSystem}-${tenancy}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        {
          Type: 'TERM_MATCH',
          Field: 'instanceType',
          Value: instanceType
        },
        {
          Type: 'TERM_MATCH',
          Field: 'location',
          Value: this.getRegionName(region)
        },
        {
          Type: 'TERM_MATCH',
          Field: 'operatingSystem',
          Value: operatingSystem
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
        MaxResults: 100
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        logger.warn(`No pricing found for ${instanceType} in ${region}`);
        return this.getDefaultEC2Pricing(instanceType);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions)[0];

      const pricing = {
        instanceType,
        region,
        pricePerHour: parseFloat(priceDimensions.pricePerUnit.USD),
        unit: priceDimensions.unit,
        currency: 'USD',
        operatingSystem,
        tenancy
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching EC2 pricing for ${instanceType}:`, error);
      return this.getDefaultEC2Pricing(instanceType);
    }
  }

  async getRDSPricing(instanceClass, engine, region, deploymentOption = 'Single-AZ') {
    const cacheKey = `rds-${instanceClass}-${engine}-${region}-${deploymentOption}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        {
          Type: 'TERM_MATCH',
          Field: 'instanceType',
          Value: instanceClass
        },
        {
          Type: 'TERM_MATCH',
          Field: 'location',
          Value: this.getRegionName(region)
        },
        {
          Type: 'TERM_MATCH',
          Field: 'databaseEngine',
          Value: this.normalizeDBEngine(engine)
        },
        {
          Type: 'TERM_MATCH',
          Field: 'deploymentOption',
          Value: deploymentOption
        }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonRDS',
        Filters: filters,
        MaxResults: 100
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        logger.warn(`No pricing found for RDS ${instanceClass} with ${engine} in ${region}`);
        return this.getDefaultRDSPricing(instanceClass);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions)[0];

      const pricing = {
        instanceClass,
        engine,
        region,
        pricePerHour: parseFloat(priceDimensions.pricePerUnit.USD),
        unit: priceDimensions.unit,
        currency: 'USD',
        deploymentOption
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching RDS pricing for ${instanceClass}:`, error);
      return this.getDefaultRDSPricing(instanceClass);
    }
  }

  async getEBSPricing(volumeType, region) {
    const cacheKey = `ebs-${volumeType}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        {
          Type: 'TERM_MATCH',
          Field: 'volumeApiName',
          Value: volumeType
        },
        {
          Type: 'TERM_MATCH',
          Field: 'location',
          Value: this.getRegionName(region)
        }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonEC2',
        Filters: filters,
        MaxResults: 100
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        return this.getDefaultEBSPricing(volumeType);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions)[0];

      const pricing = {
        volumeType,
        region,
        pricePerGBMonth: parseFloat(priceDimensions.pricePerUnit.USD),
        currency: 'USD'
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching EBS pricing for ${volumeType}:`, error);
      return this.getDefaultEBSPricing(volumeType);
    }
  }

  async getS3Pricing(storageClass, region) {
    const cacheKey = `s3-${storageClass}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        {
          Type: 'TERM_MATCH',
          Field: 'storageClass',
          Value: storageClass
        },
        {
          Type: 'TERM_MATCH',
          Field: 'location',
          Value: this.getRegionName(region)
        }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonS3',
        Filters: filters,
        MaxResults: 100
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        return this.getDefaultS3Pricing(storageClass);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions);

      // S3 has tiered pricing, get first tier
      const firstTier = priceDimensions.find(pd => pd.beginRange === '0');
      
      const pricing = {
        storageClass,
        region,
        pricePerGBMonth: firstTier ? parseFloat(firstTier.pricePerUnit.USD) : 0.023,
        currency: 'USD'
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching S3 pricing for ${storageClass}:`, error);
      return this.getDefaultS3Pricing(storageClass);
    }
  }

  getRegionName(regionCode) {
    const regionMapping = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'EU (Ireland)',
      'eu-central-1': 'EU (Frankfurt)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ap-south-1': 'Asia Pacific (Mumbai)'
    };

    return regionMapping[regionCode] || 'US East (N. Virginia)';
  }

  normalizeDBEngine(engine) {
    const engineMapping = {
      'postgres': 'PostgreSQL',
      'mysql': 'MySQL',
      'mariadb': 'MariaDB',
      'aurora': 'Aurora MySQL',
      'aurora-mysql': 'Aurora MySQL',
      'aurora-postgresql': 'Aurora PostgreSQL'
    };

    return engineMapping[engine.toLowerCase()] || engine;
  }

  getDefaultEC2Pricing(instanceType) {
    // Fallback pricing based on instance size
    const defaultPrices = {
      't2.micro': 0.0116,
      't2.small': 0.023,
      't2.medium': 0.0464,
      't3.micro': 0.0104,
      't3.small': 0.0208,
      't3.medium': 0.0416,
      'm5.large': 0.096,
      'm5.xlarge': 0.192,
      'm5.2xlarge': 0.384,
      'c5.large': 0.085,
      'c5.xlarge': 0.17,
      'r5.large': 0.126,
      'r5.xlarge': 0.252
    };

    return {
      instanceType,
      region: 'us-east-1',
      pricePerHour: defaultPrices[instanceType] || 0.10,
      unit: 'Hrs',
      currency: 'USD',
      isEstimate: true
    };
  }

  getDefaultRDSPricing(instanceClass) {
    const defaultPrices = {
      'db.t3.micro': 0.017,
      'db.t3.small': 0.034,
      'db.t3.medium': 0.068,
      'db.m5.large': 0.192,
      'db.m5.xlarge': 0.384,
      'db.r5.large': 0.24,
      'db.r5.xlarge': 0.48
    };

    return {
      instanceClass,
      region: 'us-east-1',
      pricePerHour: defaultPrices[instanceClass] || 0.10,
      unit: 'Hrs',
      currency: 'USD',
      isEstimate: true
    };
  }

  getDefaultEBSPricing(volumeType) {
    const defaultPrices = {
      'gp2': 0.10,
      'gp3': 0.08,
      'io1': 0.125,
      'io2': 0.125,
      'st1': 0.045,
      'sc1': 0.015,
      'standard': 0.05
    };

    return {
      volumeType,
      region: 'us-east-1',
      pricePerGBMonth: defaultPrices[volumeType] || 0.10,
      currency: 'USD',
      isEstimate: true
    };
  }

  getDefaultS3Pricing(storageClass) {
    const defaultPrices = {
      'STANDARD': 0.023,
      'INTELLIGENT_TIERING': 0.023,
      'STANDARD_IA': 0.0125,
      'ONEZONE_IA': 0.01,
      'GLACIER': 0.004,
      'DEEP_ARCHIVE': 0.00099
    };

    return {
      storageClass,
      region: 'us-east-1',
      pricePerGBMonth: defaultPrices[storageClass] || 0.023,
      currency: 'USD',
      isEstimate: true
    };
  }

  isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    
    const cached = this.cache.get(key);
    return Date.now() - cached.timestamp < this.cacheExpiry;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}