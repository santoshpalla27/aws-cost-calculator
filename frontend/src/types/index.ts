// API Response Types

export interface InstanceTypeInfo {
  instance_type: string;
  vcpu: number | null;
  memory_gib: number | null;
  network_performance: string | null;
  storage: string | null;
}

export interface EC2PricingResponse {
  instance_type: string;
  region: string;
  operating_system: string;
  price_per_hour: number;
  price_per_month: number;
  currency: string;
  on_demand: boolean;
  details: Record<string, any> | null;
}

export interface ResourceCostEstimate {
  resource: string;
  resource_type: string;
  resource_name: string;
  instance_type: string | null;
  region: string | null;
  price_per_hour: number | null;
  price_per_month: number;
  price_per_year: number | null;
  currency: string;
  pricing_details: Record<string, any> | null;
  warnings: string[];
}

export interface TerraformScanResponse {
  success: boolean;
  resources: ResourceCostEstimate[];
  total_monthly_cost: number;
  total_yearly_cost: number;
  currency: string;
  resource_count: number;
  warnings: string[];
  errors: string[];
  scan_duration_seconds: number;
}

export interface InstanceTypesResponse {
  instance_types: InstanceTypeInfo[];
  total_count: number;
  cached: boolean;
}

export interface Region {
  code: string;
  name: string;
}

export interface RegionsResponse {
  regions: Region[];
}

export type OperatingSystem = 'Linux' | 'Windows' | 'RHEL' | 'SUSE';

export interface PriceCheckerParams {
  instanceType: string;
  region: string;
  operatingSystem: OperatingSystem;
}