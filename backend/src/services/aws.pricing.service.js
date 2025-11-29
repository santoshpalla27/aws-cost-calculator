
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
    const cacheKey = `ec2-\${instanceType}-\${region}-\${operatingSystem}-\${tenancy}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceType },
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'operatingSystem', Value: operatingSystem },
        { Type: 'TERM_MATCH', Field: 'tenancy', Value: tenancy },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw', Value: 'NA' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus', Value: 'Used' }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonEC2',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No pricing data found for \${instanceType} in \${region}`);
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
      logger.error(`Error fetching EC2 pricing for \${instanceType}:`, error);
      throw new Error(`Unable to fetch pricing for \${instanceType} in \${region}. Please verify the instance type exists.`);
    }
  }

  async getRDSPricing(instanceClass, engine, region, deploymentOption = 'Single-AZ') {
    const cacheKey = `rds-\${instanceClass}-\${engine}-\${region}-\${deploymentOption}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: instanceClass },
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'databaseEngine', Value: this.normalizeDBEngine(engine) },
        { Type: 'TERM_MATCH', Field: 'deploymentOption', Value: deploymentOption }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonRDS',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No pricing data found for RDS \${instanceClass} with \${engine} in \${region}`);
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
      logger.error(`Error fetching RDS pricing for \${instanceClass}:`, error);
      throw new Error(`Unable to fetch RDS pricing for \${instanceClass} with \${engine} in \${region}`);
    }
  }

  async getEBSPricing(volumeType, region) {
    const cacheKey = `ebs-\${volumeType}-\${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'volumeApiName', Value: volumeType },
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonEC2',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No pricing data found for EBS \${volumeType} in \${region}`);
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
      logger.error(`Error fetching EBS pricing for \${volumeType}:`, error);
      throw new Error(`Unable to fetch EBS pricing for \${volumeType} in \${region}`);
    }
  }

  async getNATGatewayPricing(region) {
    const cacheKey = `nat-gateway-\${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'NAT Gateway' }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonEC2',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No NAT Gateway pricing found for \${region}`);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions);

      // Find hourly rate and data processing rate
      const hourlyDimension = priceDimensions.find(pd => 
        pd.description && pd.description.toLowerCase().includes('hour')
      );

      const dataProcessingDimension = priceDimensions.find(pd => 
        pd.description && pd.description.toLowerCase().includes('data processed')
      );

      const pricing = {
        region,
        pricePerHour: hourlyDimension ? parseFloat(hourlyDimension.pricePerUnit.USD) : null,
        dataProcessingPerGB: dataProcessingDimension ? parseFloat(dataProcessingDimension.pricePerUnit.USD) : null,
        currency: 'USD'
      };

      if (!pricing.pricePerHour || !pricing.dataProcessingPerGB) {
        throw new Error('Invalid NAT Gateway pricing data structure');
      }

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching NAT Gateway pricing:`, error);
      throw new Error(`Unable to fetch NAT Gateway pricing for \${region}`);
    }
  }

  async getLoadBalancerPricing(lbType, region) {
    const cacheKey = `lb-\${lbType}-\${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const productFamily = lbType === 'application' ? 
        'Load Balancer-Application' : 'Load Balancer-Network';
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: productFamily }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AWSELB',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No Load Balancer pricing found for \${lbType} in \${region}`);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions);

      const hourlyDimension = priceDimensions.find(pd => pd.unit === 'Hrs');
      const lcuDimension = priceDimensions.find(pd => pd.unit && pd.unit.includes('LCU'));

      const pricing = {
        lbType,
        region,
        pricePerHour: hourlyDimension ? parseFloat(hourlyDimension.pricePerUnit.USD) : null,
        pricePerLCU: lcuDimension ? parseFloat(lcuDimension.pricePerUnit.USD) : null,
        currency: 'USD'
      };

      if (!pricing.pricePerHour) {
        throw new Error('Invalid Load Balancer pricing data');
      }

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching Load Balancer pricing:`, error);
      throw new Error(`Unable to fetch Load Balancer pricing for \${lbType} in \${region}`);
    }
  }

  async getCloudWatchAlarmPricing(region) {
    const cacheKey = `cloudwatch-alarm-\${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'Alarm' }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonCloudWatch',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No CloudWatch Alarm pricing found for \${region}`);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions)[0];

      const pricing = {
        region,
        pricePerAlarmMonth: parseFloat(priceDimensions.pricePerUnit.USD),
        currency: 'USD'
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching CloudWatch Alarm pricing:`, error);
      throw new Error(`Unable to fetch CloudWatch Alarm pricing for \${region}`);
    }
  }

  async getElastiCachePricing(nodeType, region) {
    const cacheKey = `elasticache-\${nodeType}-\${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'cacheEngine', Value: 'Redis' },
        { Type: 'TERM_MATCH', Field: 'instanceType', Value: nodeType },
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonElastiCache',
        Filters: filters,
        MaxResults: 10
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No ElastiCache pricing found for \${nodeType} in \${region}`);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions)[0];

      const pricing = {
        nodeType,
        region,
        pricePerHour: parseFloat(priceDimensions.pricePerUnit.USD),
        unit: priceDimensions.unit,
        currency: 'USD'
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Error fetching ElastiCache pricing for \${nodeType}:`, error);
      throw new Error(`Unable to fetch ElastiCache pricing for \${nodeType} in \${region}`);
    }
  }

  getRegionName(regionCode) {
    const regionMapping = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'EU (Ireland)',
      'eu-west-2': 'EU (London)',
      'eu-central-1': 'EU (Frankfurt)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ap-south-1': 'Asia Pacific (Mumbai)'
    };

    return regionMapping[regionCode] || regionMapping['us-east-1'];
  }

  normalizeDBEngine(engine) {
    const engineMapping = {
      'postgres': 'PostgreSQL',
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'mariadb': 'MariaDB',
      'aurora': 'Aurora MySQL',
      'aurora-mysql': 'Aurora MySQL',
      'aurora-postgresql': 'Aurora PostgreSQL',
      'oracle-se2': 'Oracle',
      'sqlserver-ex': 'SQL Server'
    };

    return engineMapping[engine.toLowerCase()] || engine;
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

  clearCache() {
    this.cache.clear();
  }
}