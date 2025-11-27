import { pricing } from '../config/aws';
import { logger } from '../utils/logger';
import { PriceCalculator } from '../utils/priceCalculator';

export interface RDSCostRequest {
  engine: string;
  instanceClass: string;
  region: string;
  storageType: string;
  storageSize: number;
  multiAZ: boolean;
  backupStorage: number;
}

export interface RDSCostResult {
  monthlyCost: number;
  hourlyCost: number;
  breakdown: {
    instanceCost: number;
    storageCost: number;
    ioCost: number;
    backupCost: number;
  };
}

export class RDSPricingService {
  private priceCalculator: PriceCalculator;

  constructor() {
    this.priceCalculator = new PriceCalculator();
  }

  async calculateRDSCost(
    engine: string,
    instanceClass: string,
    region: string,
    storageType: string,
    storageSize: number = 100,
    multiAZ: boolean = false,
    backupStorage: number = 0
  ): Promise<RDSCostResult> {
    try {
      // Calculate instance cost
      const hourlyInstanceCost = await this.getInstanceCost(engine, instanceClass, region, multiAZ);
      const monthlyInstanceCost = hourlyInstanceCost * 730; // 730 hours in a month

      // Calculate storage cost
      const monthlyStorageCost = await this.getStorageCost(storageType, storageSize, region);

      // Calculate I/O cost (simplified)
      const monthlyIOCost = 0; // Would be calculated based on actual I/O in a real implementation

      // Calculate backup cost
      const monthlyBackupCost = await this.getBackupCost(backupStorage, region);

      // Calculate total cost
      const totalMonthlyCost = monthlyInstanceCost + monthlyStorageCost + monthlyIOCost + monthlyBackupCost;
      const totalHourlyCost = hourlyInstanceCost;

      return {
        monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
        hourlyCost: parseFloat(totalHourlyCost.toFixed(2)),
        breakdown: {
          instanceCost: parseFloat(monthlyInstanceCost.toFixed(2)),
          storageCost: parseFloat(monthlyStorageCost.toFixed(2)),
          ioCost: parseFloat(monthlyIOCost.toFixed(2)),
          backupCost: parseFloat(monthlyBackupCost.toFixed(2))
        }
      };
    } catch (error) {
      logger.error('Error calculating RDS cost:', error);
      throw error;
    }
  }

  private async getInstanceCost(
    engine: string,
    instanceClass: string,
    region: string,
    multiAZ: boolean
  ): Promise<number> {
    // This is a simplified implementation
    // In a real system, this would query the AWS Pricing API
    const priceMap: { [key: string]: number } = {
      // Sample pricing data (these are illustrative, not real prices)
      'db.t3.micro': 0.017,
      'db.t3.small': 0.034,
      'db.t3.medium': 0.068,
      'db.t3.large': 0.136,
      'db.m5.large': 0.126,
      'db.m5.xlarge': 0.252,
      'db.m5.2xlarge': 0.504,
      'db.r5.large': 0.179,
      'db.r5.xlarge': 0.358,
      'db.r5.2xlarge': 0.716,
    };

    // Determine the base price based on instance class
    const basePrice = priceMap[instanceClass] || 0.15; // Default to $0.15/hr if not found

    // Adjust price based on engine
    const engineMultiplier = engine.includes('postgres') || engine.includes('mysql') ? 1.0 :
      engine.includes('oracle') ? 1.5 : 1.2;

    // Adjust based on region
    const regionMultiplier = region.startsWith('us-') ? 1.0 : 1.1;

    // Multi-AZ doubles the cost
    const multiAZMultiplier = multiAZ ? 2.0 : 1.0;

    return basePrice * engineMultiplier * regionMultiplier * multiAZMultiplier;
  }

  private async getStorageCost(
    storageType: string,
    storageSize: number,
    region: string
  ): Promise<number> {
    // Storage pricing per GB-month
    const storagePricePerGBMonth: { [key: string]: number } = {
      'gp2': 0.10, // General purpose SSD
      'gp3': 0.08, // General purpose SSD (newer)
      'io1': 0.125, // Provisioned IOPS SSD
      'io2': 0.115, // Provisioned IOPS SSD (newer)
      'standard': 0.05, // Magnetic
      'aurora': 0.115 // Aurora storage
    };

    const pricePerGB = storagePricePerGBMonth[storageType] || 0.10;

    return storageSize * pricePerGB;
  }

  private async getBackupCost(
    backupStorage: number,
    region: string
  ): Promise<number> {
    // Backup storage pricing per GB-month
    const backupPricePerGBMonth = 0.095; // Simplified backup price

    return backupStorage * backupPricePerGBMonth;
  }
}