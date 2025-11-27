export interface PricingCalculation {
  id: string;
  userId: string;
  serviceType: string;
  calculationParams: any;
  result: any;
  totalMonthlyCost: number;
  createdAt: Date;
}

export class PricingCalculationModel {
  static create(data: Partial<PricingCalculation>): PricingCalculation {
    return {
      id: data.id || '',
      userId: data.userId || '',
      serviceType: data.serviceType || '',
      calculationParams: data.calculationParams || {},
      result: data.result || {},
      totalMonthlyCost: data.totalMonthlyCost || 0,
      createdAt: data.createdAt || new Date(),
    };
  }
}