import logger from '../../config/logger.config.js';

/**
 * Registry for all pricing service providers
 * Manages service discovery and routing
 */
export class PricingRegistry {
  constructor() {
    this.providers = new Map();
    this.resourceTypeMap = new Map();
  }

  /**
   * Register a pricing provider
   */
  register(provider) {
    const name = provider.serviceName;
    this.providers.set(name, provider);
    
    // Map resource types to provider
    for (const resourceType of provider.getSupportedResourceTypes()) {
      this.resourceTypeMap.set(resourceType, provider);
      logger.debug(`Registered ${resourceType} -> ${name}`);
    }
    
    logger.info(`Registered pricing provider: ${name} (${provider.getSupportedResourceTypes().length} resource types)`);
  }

  /**
   * Get provider for a resource type
   */
  getProvider(resourceType) {
    return this.resourceTypeMap.get(resourceType);
  }

  /**
   * Check if resource type is supported
   */
  isSupported(resourceType) {
    return this.resourceTypeMap.has(resourceType);
  }

  /**
   * Get all supported resource types
   */
  getSupportedResourceTypes() {
    return Array.from(this.resourceTypeMap.keys());
  }

  /**
   * Get all registered providers
   */
  getAllProviders() {
    return Array.from(this.providers.values());
  }

  /**
   * Calculate cost for a resource
   */
  async calculateCost(resource, region) {
    const provider = this.getProvider(resource.type);
    
    if (!provider) {
      logger.debug(`No pricing provider for ${resource.type}`);
      return null;
    }

    try {
      return await provider.calculateCost(resource, region);
    } catch (error) {
      logger.error(`Error calculating cost for ${resource.type}.${resource.name}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const pricingRegistry = new PricingRegistry();