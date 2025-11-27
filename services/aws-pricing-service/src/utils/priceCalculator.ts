import { logger } from './logger';

export class PriceCalculator {
  /**
   * Calculates the total cost based on hourly rate, quantity, and hours per month
   */
  calculateMonthlyCost(hourlyRate: number, quantity: number, hoursPerMonth: number = 730): number {
    return hourlyRate * quantity * hoursPerMonth;
  }

  /**
   * Applies a discount to a given price
   */
  applyDiscount(price: number, discountPercentage: number): number {
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
    
    return price * (1 - discountPercentage / 100);
  }

  /**
   * Applies a markup to a given price
   */
  applyMarkup(price: number, markupPercentage: number): number {
    if (markupPercentage < 0) {
      throw new Error('Markup percentage must be non-negative');
    }
    
    return price * (1 + markupPercentage / 100);
  }

  /**
   * Rounds a price to the specified number of decimal places
   */
  roundPrice(price: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(price * factor) / factor;
  }

  /**
   * Calculates costs with tiered pricing
   */
  calculateTieredCost(
    quantity: number,
    tiers: Array<{ limit: number; pricePerUnit: number }>
  ): number {
    let totalCost = 0;
    let remainingQuantity = quantity;

    for (const tier of tiers) {
      if (remainingQuantity <= 0) break;

      const applicableQuantity = Math.min(remainingQuantity, tier.limit);
      totalCost += applicableQuantity * tier.pricePerUnit;
      remainingQuantity -= applicableQuantity;

      // If this was the last tier, apply its rate to any remaining quantity
      if (remainingQuantity > 0 && tier === tiers[tiers.length - 1]) {
        totalCost += remainingQuantity * tier.pricePerUnit;
        break;
      }
    }

    return totalCost;
  }

  /**
   * Converts currency values (simplified)
   */
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    // This is a simplified conversion - in a real implementation,
    // you would fetch real exchange rates
    if (fromCurrency === toCurrency) return amount;

    // Assume USD as base currency
    const exchangeRates: { [key: string]: number } = {
      'USD': 1,
      'EUR': 0.85,
      'GBP': 0.75,
      'JPY': 110,
    };

    const fromRate = exchangeRates[fromCurrency.toUpperCase()] || 1;
    const toRate = exchangeRates[toCurrency.toUpperCase()] || 1;

    // Convert to USD first, then to target currency
    const inUSD = amount / fromRate;
    return inUSD * toRate;
  }
}