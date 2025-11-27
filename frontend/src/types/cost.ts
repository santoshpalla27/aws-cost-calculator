export interface CostEstimation {
  success: boolean;
  totalMonthlyCost: number;
  totalHourlyCost: number;
  currency: string;
  resources: Resource[];
  summary: CostSummary;
  breakdown?: any;
}

export interface Resource {
  name: string;
  type: string;
  monthlyCost: number;
  hourlyCost: number;
  costComponents?: CostComponent[];
}

export interface CostComponent {
  name: string;
  unit: string;
  monthlyCost: number;
  price: number;
}

export interface CostSummary {
  totalResources: number;
  resourcesByType: Record<string, number>;
  costByService: Record<string, number>;
}