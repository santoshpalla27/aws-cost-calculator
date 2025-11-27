import { pricing } from '../config/aws';
import { logger } from '../utils/logger';
import { PriceCalculator } from '../utils/priceCalculator';

export interface S3CostRequest {
  storageClass: string;
  storageSize: number;
  monthlyRequests: number;
  monthlyDataTransfer: number;
  region: string;
}

export interface S3CostResult {
  monthlyCost: number;
  breakdown: {
    storageCost: number;
    requestCost: number;
    dataTransferCost: number;
  };
}

export class S3PricingService {
  private priceCalculator: PriceCalculator;

  constructor() {
    this.priceCalculator = new PriceCalculator();
  }

  async calculateS3Cost(
    storageClass: string,
    storageSize: number = 100,
    monthlyRequests: number = 0,
    monthlyDataTransfer: number = 0,
    region: string = 'us-east-1'
  ): Promise<S3CostResult> {
    try {
      // Calculate storage cost
      const monthlyStorageCost = await this.getStorageCost(storageClass, storageSize, region);

      // Calculate request cost
      const monthlyRequestCost = await this.getRequestCost(storageClass, monthlyRequests);

      // Calculate data transfer cost
      const monthlyDataTransferCost = await this.getDataTransferCost(monthlyDataTransfer, region);

      // Calculate total cost
      const totalMonthlyCost = monthlyStorageCost + monthlyRequestCost + monthlyDataTransferCost;

      return {
        monthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
        breakdown: {
          storageCost: parseFloat(monthlyStorageCost.toFixed(2)),
          requestCost: parseFloat(monthlyRequestCost.toFixed(2)),
          dataTransferCost: parseFloat(monthlyDataTransferCost.toFixed(2))
        }
      };
    } catch (error) {
      logger.error('Error calculating S3 cost:', error);
      throw error;
    }
  }

  private async getStorageCost(
    storageClass: string,
    storageSize: number,
    region: string
  ): Promise<number> {
    // Storage pricing per GB-month by storage class
    const storagePricePerGBMonth: { [key: string]: number } = {
      'STANDARD': 0.023, // S3 Standard
      'STANDARD_IA': 0.0044, // S3 Standard-IA
      'ONEZONE_IA': 0.0044, // S3 One Zone-IA
      'INTELLIGENT_TIERING': 0.0044, // S3 Intelligent-Tiering
      'GLACIER': 0.004, // S3 Glacier
      'GLACIER_IR': 0.004, // S3 Glacier Instant Retrieval
      'DEEP_ARCHIVE': 0.00099 // S3 Glacier Deep Archive
    };

    const pricePerGB = storagePricePerGBMonth[storageClass.toUpperCase()] || 0.023;
    
    return storageSize * pricePerGB;
  }

  private async getRequestCost(
    storageClass: string,
    monthlyRequests: number
  ): Promise<number> {
    // Request pricing per 1000 requests by storage class
    const requestPricePer1000: { [key: string]: number } = {
      'STANDARD': 0.005, // GET, SELECT, and all other requests
      'STANDARD_IA': 0.01, // GET, SELECT, and all other requests
      'ONEZONE_IA': 0.01, // GET, SELECT, and all other requests
      'INTELLIGENT_TIERING': 0.005, // GET, SELECT, and all other requests
      'GLACIER': 0.005, // Glacier retrieval requests
      'GLACIER_IR': 0.01, // Glacier Instant Retrieval retrieval requests
      'DEEP_ARCHIVE': 0.01 // Glacier Deep Archive retrieval requests
    };

    const requestsPer1000 = Math.ceil(monthlyRequests / 1000);
    const pricePer1000Requests = requestPricePer1000[storageClass.toUpperCase()] || 0.005;
    
    return requestsPer1000 * pricePer1000Requests;
  }

  private async getDataTransferCost(
    monthlyDataTransfer: number,
    region: string
  ): Promise<number> {
    // Simplified data transfer pricing
    // First 10TB per month: $0.09 per GB
    // Next 40TB per month: $0.085 per GB
    // Next 100TB per month: $0.07 per GB
    // Next 350TB per month: $0.05 per GB
    
    let totalCost = 0;
    let remainingData = monthlyDataTransfer;

    if (remainingData > 0) {
      // First 10TB (10,240 GB)
      const firstTier = Math.min(remainingData, 10240);
      totalCost += firstTier * 0.09;
      remainingData -= firstTier;
    }

    if (remainingData > 0) {
      // Next 40TB (40,960 GB)
      const secondTier = Math.min(remainingData, 40960);
      totalCost += secondTier * 0.085;
      remainingData -= secondTier;
    }

    if (remainingData > 0) {
      // Next 100TB (102,400 GB)
      const thirdTier = Math.min(remainingData, 102400);
      totalCost += thirdTier * 0.07;
      remainingData -= thirdTier;
    }

    if (remainingData > 0) {
      // Remaining data at lowest tier
      totalCost += remainingData * 0.05;
    }

    return totalCost;
  }
}