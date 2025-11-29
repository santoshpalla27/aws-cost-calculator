import { GetProductsCommand } from '@aws-sdk/client-pricing';
import logger from '../../config/logger.config.js';

/**
 * Base class for all AWS pricing services
 * Fetches REAL prices from AWS Pricing API with fallback support
 */
export class BasePricingService {
  constructor(pricingClient, serviceName) {
    this.pricingClient = pricingClient;
    this.serviceName = serviceName;
    this.cache = new Map();
    this.cacheExpiry = 86400000; // 24 hours
    this.fallbackPricing = new Map(); // Subclasses populate this
  }

  /**
   * Get the AWS service code for pricing API
   */
  getServiceCode() {
    throw new Error('getServiceCode() must be implemented by subclass');
  }

  /**
   * Get supported Terraform resource types
   */
  getSupportedResourceTypes() {
    throw new Error('getSupportedResourceTypes() must be implemented by subclass');
  }

  /**
   * Calculate cost for a resource
   */
  async calculateCost(resource, region) {
    throw new Error('calculateCost() must be implemented by subclass');
  }

  /**
   * Check if this service can handle the resource type
   */
  canHandle(resourceType) {
    return this.getSupportedResourceTypes().includes(resourceType);
  }

  /**
   * Fetch pricing from AWS Pricing API - REAL API CALL
   */
  async fetchPricing(filters, maxResults = 100) {
    try {
      const command = new GetProductsCommand({
        ServiceCode: this.getServiceCode(),
        Filters: filters,
        MaxResults: maxResults
      });

      logger.info(`Fetching ${this.serviceName} pricing from AWS API...`);
      const response = await this.pricingClient.send(command);
      
      if (response.PriceList && response.PriceList.length > 0) {
        logger.info(`Received ${response.PriceList.length} pricing entries for ${this.serviceName}`);
        return response.PriceList;
      }
      
      logger.warn(`No pricing data returned from AWS API for ${this.serviceName}`);
      return [];
    } catch (error) {
      logger.error(`AWS Pricing API error for ${this.serviceName}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse price from AWS pricing response
   */
  parsePriceFromResponse(priceList, termType = 'OnDemand') {
    if (!priceList || priceList.length === 0) {
      return null;
    }

    try {
      const priceData = typeof priceList[0] === 'string' 
        ? JSON.parse(priceList[0]) 
        : priceList[0];
      
      const terms = priceData.terms?.[termType];
      if (!terms) return null;

      const firstTerm = Object.values(terms)[0];
      const priceDimensions = Object.values(firstTerm.priceDimensions);
      
      return priceDimensions.map(pd => ({
        price: parseFloat(pd.pricePerUnit.USD || 0),
        unit: pd.unit,
        description: pd.description,
        beginRange: pd.beginRange,
        endRange: pd.endRange
      }));
    } catch (error) {
      logger.error('Error parsing pricing response:', error);
      return null;
    }
  }

  /**
   * Get pricing with cache and fallback - MAIN METHOD FOR FETCHING PRICES
   */
  async getPricingWithFallback(cacheKey, fetchFn, fallbackKey) {
    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached !== null) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    try {
      // Try to fetch from AWS API
      const price = await fetchFn();
      if (price !== null && price !== undefined) {
        this.setCache(cacheKey, price);
        return price;
      }
    } catch (error) {
      logger.warn(`Failed to fetch pricing for ${cacheKey}: ${error.message}`);
    }

    // Use fallback pricing
    if (this.fallbackPricing.has(fallbackKey)) {
      const fallback = this.fallbackPricing.get(fallbackKey);
      logger.warn(`Using fallback pricing for ${fallbackKey}: $${fallback}`);
      this.setCache(cacheKey, fallback);
      return fallback;
    }

    logger.error(`No pricing available for ${cacheKey} and no fallback defined`);
    return 0;
  }

  /**
   * Get region display name for pricing API
   */
  getRegionName(regionCode) {
    const regionMapping = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'EU (Ireland)',
      'eu-west-2': 'EU (London)',
      'eu-west-3': 'EU (Paris)',
      'eu-central-1': 'EU (Frankfurt)',
      'eu-north-1': 'EU (Stockholm)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ap-northeast-2': 'Asia Pacific (Seoul)',
      'ap-northeast-3': 'Asia Pacific (Osaka)',
      'ap-south-1': 'Asia Pacific (Mumbai)',
      'sa-east-1': 'South America (Sao Paulo)',
      'ca-central-1': 'Canada (Central)',
      'me-south-1': 'Middle East (Bahrain)',
      'af-south-1': 'Africa (Cape Town)'
    };
    return regionMapping[regionCode] || regionMapping['us-east-1'];
  }

  /**
   * Cache management
   */
  getCached(key) {
    if (!this.cache.has(key)) return null;
    const cached = this.cache.get(key);
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Utility methods
   */
  monthlyToHourly(monthlyCost) {
    return monthlyCost / 730;
  }

  hourlyToMonthly(hourlyCost) {
    return hourlyCost * 730;
  }

  formatCostResponse(hourly, breakdown, details) {
    return {
      hourly,
      monthly: hourly * 730,
      breakdown,
      details
    };
  }
}