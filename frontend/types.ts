// Terraform Plan Types
export interface TfResourceChange {
    address: string;
    type: string;
    name: string;
    change: {
        actions: string[];
        before: any;
        after: any;
    };
}

export interface TfPlan {
    format_version: string;
    terraform_version: string;
    resource_changes: TfResourceChange[];
}

// Cost Model Types
export interface CostItem {
    id: string;
    resourceName: string;
    resourceType: string;
    region: string;
    monthlyCost: number;
    breakdown: {
        unit: string;
        rate: number;
        quantity: number;
        description: string;
    }[];
    metadata: Record<string, any>;
}

export interface CostReport {
    totalMonthlyCost: number;
    currency: string;
    items: CostItem[];
    summaryByService: Record<string, number>;
    errors?: {
        resource: string;
        type: string;
        error: string;
    }[];
}

export interface DiffReport {
    oldCost: number;
    newCost: number;
    diff: number;
    percentChange: number;
    addedItems: CostItem[];
    removedItems: CostItem[];
    modifiedItems: {
        resourceName: string;
        oldCost: number;
        newCost: number;
        diff: number;
    }[];
}

export enum ViewMode {
    UPLOAD = 'UPLOAD',
    REPORT = 'REPORT',
    DIFF = 'DIFF'
}