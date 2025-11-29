import logger from '../../config/logger.config.js';

/**
 * Base class for all AWS pricing services
 * Provides common functionality for fetching and caching prices
 */
export class BasePricingService {
  constructor(pricingClient, serviceName) {
    this.pricingClient = pricingClient;
    this.serviceName = serviceName;
    this.cache = new Map();
    this.cacheExpiry = 86400000; // 24 hours
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
   * @param {Object} resource - Terraform resource
   * @param {string} region - AWS region
   * @returns {Promise<object>} Cost breakdown
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
   * Fetch pricing from AWS Pricing API
   */
  async fetchPricing(filters, maxResults = 100) {
    const { GetProductsCommand } = await import('@aws-sdk/client-pricing');
    
    const command = new GetProductsCommand({
      ServiceCode: this.getServiceCode(),
      Filters: filters,
      MaxResults: maxResults
    });

    try {
      const response = await this.pricingClient.send(command);
      return response.PriceList || [];
    } catch (error) {
      logger.error(`Error fetching ${this.serviceName} pricing:`, error);
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

    const priceData = JSON.parse(priceList[0]);
    const terms = priceData.terms[termType];
    
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

  /**
   * Convert monthly cost to hourly
   */
  monthlyToHourly(monthlyCost) {
    return monthlyCost / 730; // Average hours in a month
  }

  /**
   * Convert GB to bytes
   */
  gbToBytes(gb) {
    return gb * 1024 * 1024 * 1024;
  }

  /**
   * Format cost response
   */
  formatCostResponse(hourly, breakdown, details) {
    return {
      hourly,
      monthly: hourly * 730,
      breakdown,
      details
    };
  }
}