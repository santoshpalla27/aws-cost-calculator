export interface EC2Config {
  instanceType: string;
  region: string;
  osType: string;
  tenancy: string;
  pricingModel: string;
  quantity: number;
  hoursPerMonth: number;
}

export interface RDSConfig {
  engine: string;
  instanceClass: string;
  region: string;
  storageType: string;
  storageSize: number;
  multiAZ: boolean;
  backupStorage: number;
}

export interface S3Config {
  region: string;
  storageClass: string;
  storageAmount: number;
  putRequests: number;
  getRequests: number;
  dataTransferOut: number;
}

export interface EKSConfig {
  region: string;
  clusterCount: number;
  nodeGroups: NodeGroup[];
  fargateVCPU: number;
  fargateMemoryGB: number;
}

export interface NodeGroup {
  instanceType: string;
  nodeCount: number;
  storageSize: number;
}