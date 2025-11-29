import { GetProductsCommand } from '@aws-sdk/client-pricing';
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
      logger.info(`Cache hit for EC2: ${instanceType}`);
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching EC2 pricing for ${instanceType} in ${region}...`);
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
        throw new Error(`No pricing data found for ${instanceType} in ${region}`);
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

      logger.info(`EC2 pricing fetched: ${instanceType} = $${pricing.pricePerHour}/hour`);
      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch EC2 pricing for ${instanceType}:`, error.message);
      throw error;
    }
  }

  async getRDSPricing(instanceClass, engine, region, deploymentOption = 'Single-AZ') {
    const cacheKey = `rds-${instanceClass}-${engine}-${region}-${deploymentOption}`;
    
    if (this.isCacheValid(cacheKey)) {
      logger.info(`Cache hit for RDS: ${instanceClass}`);
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching RDS pricing for ${instanceClass} (${engine}) in ${region}...`);
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
        throw new Error(`No pricing data found for RDS ${instanceClass} with ${engine}`);
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

      logger.info(`RDS pricing fetched: ${instanceClass} = $${pricing.pricePerHour}/hour`);
      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch RDS pricing for ${instanceClass}:`, error.message);
      throw error;
    }
  }

  async getEBSPricing(volumeType, region) {
    const cacheKey = `ebs-${volumeType}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching EBS pricing for ${volumeType} in ${region}...`);
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
        throw new Error(`No pricing data found for EBS ${volumeType}`);
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

      logger.info(`EBS pricing fetched: ${volumeType} = $${pricing.pricePerGBMonth}/GB-month`);
      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch EBS pricing for ${volumeType}:`, error.message);
      throw error;
    }
  }

  async getNATGatewayPricing(region) {
    const cacheKey = `nat-gateway-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching NAT Gateway pricing for ${region}...`);
      const pricingClient = this.clientFactory.createPricingClient();
      
      // Get all NAT Gateway related pricing
      const filters = [
        { Type: 'TERM_MATCH', Field: 'location', Value: this.getRegionName(region) },
        { Type: 'TERM_MATCH', Field: 'productFamily', Value: 'NAT Gateway' }
      ];

      const command = new GetProductsCommand({
        ServiceCode: 'AmazonEC2',
        Filters: filters,
        MaxResults: 50
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No NAT Gateway pricing found for ${region}`);
      }

      let pricePerHour = null;
      let dataProcessingPerGB = null;

      // Parse each price item
      for (const priceItem of response.PriceList) {
        const priceData = JSON.parse(priceItem);
        const attributes = priceData.product.attributes;
        const onDemandTerms = priceData.terms.OnDemand;
        const firstTerm = Object.values(onDemandTerms)[0];
        const priceDimensions = Object.values(firstTerm.priceDimensions);

        for (const dimension of priceDimensions) {
          const desc = (dimension.description || '').toLowerCase();
          const unit = (dimension.unit || '').toLowerCase();
          const usageType = (attributes.usagetype || '').toLowerCase();
          
          // Hourly charge (NAT Gateway hours)
          if ((unit === 'hrs' || desc.includes('hour')) && 
              (usageType.includes('natgateway-hours') || desc.includes('natgateway-hours'))) {
            pricePerHour = parseFloat(dimension.pricePerUnit.USD);
            logger.info(`Found NAT Gateway hourly rate: $${pricePerHour}`);
          }
          
          // Data processing charge
          if ((unit === 'gb' || desc.includes('gb')) && 
              (usageType.includes('natgateway-bytes') || desc.includes('data processed'))) {
            dataProcessingPerGB = parseFloat(dimension.pricePerUnit.USD);
            logger.info(`Found NAT Gateway data processing rate: $${dataProcessingPerGB}/GB`);
          }
        }
      }

      if (pricePerHour === null || dataProcessingPerGB === null) {
        logger.warn(`Incomplete NAT Gateway pricing data. Hour: ${pricePerHour}, Data: ${dataProcessingPerGB}`);
        throw new Error(`Could not parse complete NAT Gateway pricing for ${region}`);
      }

      const pricing = {
        region,
        pricePerHour,
        dataProcessingPerGB,
        currency: 'USD'
      };

      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch NAT Gateway pricing:`, error.message);
      throw error;
    }
  }

  async getLoadBalancerPricing(lbType, region) {
    const cacheKey = `lb-${lbType}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching Load Balancer pricing for ${lbType} in ${region}...`);
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
        MaxResults: 50
      });

      const response = await pricingClient.send(command);
      
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No Load Balancer pricing found for ${lbType} in ${region}`);
      }

      let pricePerHour = null;
      let pricePerLCU = null;

      for (const priceItem of response.PriceList) {
        const priceData = JSON.parse(priceItem);
        const attributes = priceData.product.attributes;
        const onDemandTerms = priceData.terms.OnDemand;
        const firstTerm = Object.values(onDemandTerms)[0];
        const priceDimensions = Object.values(firstTerm.priceDimensions);

        for (const dimension of priceDimensions) {
          const unit = (dimension.unit || '').toLowerCase();
          const usageType = (attributes.usagetype || '').toLowerCase();
          
          if (unit === 'hrs' || usageType.includes('loadbalancer-hour')) {
            pricePerHour = parseFloat(dimension.pricePerUnit.USD);
          }
          
          if (unit.includes('lcu') || usageType.includes('lcu-hour')) {
            pricePerLCU = parseFloat(dimension.pricePerUnit.USD);
          }
        }
      }

      if (pricePerHour === null) {
        throw new Error(`Could not parse Load Balancer hourly pricing for ${region}`);
      }

      const pricing = {
        lbType,
        region,
        pricePerHour,
        pricePerLCU: pricePerLCU || 0,
        currency: 'USD'
      };

      logger.info(`LB pricing fetched: ${lbType} = $${pricePerHour}/hour + $${pricePerLCU}/LCU`);
      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch Load Balancer pricing:`, error.message);
      throw error;
    }
  }

  async getCloudWatchAlarmPricing(region) {
    const cacheKey = `cloudwatch-alarm-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching CloudWatch Alarm pricing for ${region}...`);
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
        throw new Error(`No CloudWatch Alarm pricing found`);
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

      logger.info(`CloudWatch Alarm pricing: $${pricing.pricePerAlarmMonth}/month`);
      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch CloudWatch Alarm pricing:`, error.message);
      throw error;
    }
  }

  async getElastiCachePricing(nodeType, engine, region) {
    const cacheKey = `elasticache-${nodeType}-${engine}-${region}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      logger.info(`Fetching ElastiCache pricing for ${nodeType} (${engine}) in ${region}...`);
      const pricingClient = this.clientFactory.createPricingClient();
      
      const filters = [
        { Type: 'TERM_MATCH', Field: 'cacheEngine', Value: engine },
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
        throw new Error(`No ElastiCache pricing found for ${nodeType}`);
      }

      const priceData = JSON.parse(response.PriceList[0]);
      const onDemandTerms = priceData.terms.OnDemand;
      const firstTerm = Object.values(onDemandTerms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions)[0];

      const pricing = {
        nodeType,
        region,
        pricePerHour: parseFloat(priceDimensions.pricePerUnit.USD),
        currency: 'USD'
      };

      logger.info(`ElastiCache pricing fetched: ${nodeType} = $${pricing.pricePerHour}/hour`);
      this.setCache(cacheKey, pricing);
      return pricing;
    } catch (error) {
      logger.error(`Failed to fetch ElastiCache pricing for ${nodeType}:`, error.message);
      throw error;
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
      'aurora-postgresql': 'Aurora PostgreSQL'
    };

    return engineMapping[engine.toLowerCase()] || engine;
  }

  isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    const cached = this.cache.get(key);
    return Date.now() - cached.timestamp < this.cacheExpiry;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }
}