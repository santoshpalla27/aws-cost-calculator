import { pricing } from '../config/aws';
import { logger } from '../utils/logger';
import { PriceCalculator } from '../utils/priceCalculator';

export interface EC2CostRequest {
  instanceType: string;
  region: string;
  os: string;
  purchaseOption: 'on-demand' | 'reserved' | 'spot';
  quantity: number;
  hoursPerMonth: number;
}

export interface EC2CostResult {
  monthlyCost: number;
  hourlyCost: number;
  breakdown: {
    instanceCost: number;
    ebsCost: number;
    dataTransferCost: number;
  };
}

export class EC2PricingService {
  private priceCalculator: PriceCalculator;

  constructor() {
    this.priceCalculator = new PriceCalculator();
  }

  async calculateEC2Cost(
    instanceType: string,
    region: string,
    os: string,
    purchaseOption: 'on-demand' | 'reserved' | 'spot',
    quantity: number = 1,
    hoursPerMonth: number = 730
  ): Promise<EC2CostResult> {
    try {
      // For on-demand and reserved instances, use standard pricing
      // For spot instances, use a different pricing model
      let hourlyRate = 0;

      if (purchaseOption === 'spot') {
        // For spot pricing, we'll use a simplified calculation
        // In a real implementation, this would fetch actual spot prices
        hourlyRate = await this.getSpotPrice(instanceType, region, os);
      } else {
        // For on-demand and reserved, get the standard price
        hourlyRate = await this.getStandardPrice(instanceType, region, os, purchaseOption);
      }

      const totalHourlyCost = hourlyRate * quantity;
      const totalMonthlyCost = totalHourlyCost * hoursPerMonth;

      return {
        monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
        hourlyCost: parseFloat(totalHourlyCost.toFixed(2)),
        breakdown: {
          instanceCost: parseFloat(totalMonthlyCost.toFixed(2)),
          ebsCost: 0, // Additional EBS storage would be calculated separately
          dataTransferCost: 0 // Data transfer costs would be calculated separately
        }
      };
    } catch (error) {
      logger.error('Error calculating EC2 cost:', error);
      throw error;
    }
  }

  private async getStandardPrice(
    instanceType: string,
    region: string,
    os: string,
    purchaseOption: 'on-demand' | 'reserved'
  ): Promise<number> {
    // This is a simplified implementation
    // In a real system, this would query the AWS Pricing API
    const priceMap: { [key: string]: number } = {
      // Sample pricing data (these are illustrative, not real prices)
      't3.micro': 0.0116,
      't3.small': 0.0232,
      't3.medium': 0.0464,
      't3.large': 0.0928,
      'm5.large': 0.096,
      'm5.xlarge': 0.192,
      'm5.2xlarge': 0.384,
      'c5.large': 0.085,
      'c5.xlarge': 0.17,
      'c5.2xlarge': 0.34,
      'r5.large': 0.126,
      'r5.xlarge': 0.252,
      'r5.2xlarge': 0.504,
    };

    // Determine the base price based on instance type
    const basePrice = priceMap[instanceType] || 0.1; // Default to $0.10/hr if not found
    
    // Adjust price based on OS (Linux is typically cheaper than Windows)
    const osMultiplier = os.toLowerCase().includes('windows') ? 1.3 : 1.0;
    
    // Adjust based on region (simplified)
    const regionMultiplier = region.startsWith('us-') ? 1.0 : 1.1;
    
    return basePrice * osMultiplier * regionMultiplier;
  }

  private async getSpotPrice(
    instanceType: string,
    region: string,
    os: string
  ): Promise<number> {
    // This is a simplified spot pricing calculation
    // In a real system, this would use the EC2 spot pricing API
    const standardPrice = await this.getStandardPrice(instanceType, region, os, 'on-demand');
    
    // Spot prices are typically 10-90% less than on-demand
    // Using a random discount for demonstration
    const spotDiscount = 0.5; // 50% discount on average
    
    return standardPrice * (1 - spotDiscount);
  }

  // Additional methods for EBS and data transfer costs could be added here
}