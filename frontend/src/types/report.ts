export interface Report {
  id: string;
  userId: string;
  type: 'terraform' | 'aws_calculator';
  name: string;
  data: any;
  totalMonthlyCost: number;
  metadata?: any;
  createdAt: string;
  updatedAt?: string;
}

export interface ReportFilters {
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}