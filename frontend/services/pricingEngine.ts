import { TfResourceChange, CostItem, CostReport, DiffReport } from '../types';
import { USAGE_DEFAULTS } from '../constants';
import { fetchPrice, getRegionLocation } from './pricingService';

// Helper to construct EC2 filters
const getEC2Filters = (instanceType: string, region: string, tenancy = 'Shared', os = 'Linux') => ({
    'instanceType': instanceType,
    'location': getRegionLocation(region),
    'tenancy': tenancy,
    'operatingSystem': os,
    'preInstalledSw': 'NA',
    'capacitystatus': 'Used'
});

const calculateEC2Cost = async (resource: TfResourceChange): Promise<CostItem> => {
    const instanceType = resource.change.after.instance_type || 't3.micro';
    const region = 'us-east-1'; // In real app, extract from provider
    
    // Fetch Compute Price
    let hourlyRate = await fetchPrice({
        serviceCode: 'AmazonEC2',
        filters: getEC2Filters(instanceType, region)
    });
    
    // Fallback if API fails or returns null (prevent crash)
    if (hourlyRate === null) hourlyRate = 0;

    const monthlyCompute = hourlyRate * USAGE_DEFAULTS.hours_per_month;
    const breakdown = [
        {
            unit: 'hours',
            rate: hourlyRate,
            quantity: USAGE_DEFAULTS.hours_per_month,
            description: `Compute (${instanceType})`
        }
    ];

    // EBS Root Volume
    if (resource.change.after.root_block_device && resource.change.after.root_block_device[0]) {
        const size = resource.change.after.root_block_device[0].volume_size || 8;
        const type = resource.change.after.root_block_device[0].volume_type || 'gp3';
        
        // Simplified EBS pricing fetch (GP3)
        // Note: EBS filters are complex (volumeApiName, etc). 
        // For this demo, we try to fetch generic storage price or default to 0.08 if failed
        let storageRate = await fetchPrice({
            serviceCode: 'AmazonEC2',
            filters: {
                'volumeApiName': type,
                'location': getRegionLocation(region),
                'productFamily': 'Storage'
            }
        });

        // Basic fallback for common types if API query is too strict
        if (storageRate === null) {
            if (type === 'gp3') storageRate = 0.08;
            else if (type === 'gp2') storageRate = 0.10;
            else storageRate = 0.08;
        }

        breakdown.push({
            unit: 'GB-Month',
            rate: storageRate,
            quantity: size,
            description: `Root Storage (${type})`
        });
    }

    const total = breakdown.reduce((acc, item) => acc + (item.rate * item.quantity), 0);

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'EC2 Instance',
        region,
        monthlyCost: total,
        breakdown,
        metadata: { instanceType }
    };
};

const calculateRDSCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const instanceClass = resource.change.after.instance_class || 'db.t3.micro';
    const storageSize = resource.change.after.allocated_storage || 20;
    const engine = resource.change.after.engine || 'mysql';
    const region = 'us-east-1';

    // Fetch RDS Price
    let hourlyRate = await fetchPrice({
        serviceCode: 'AmazonRDS',
        filters: {
            'instanceType': instanceClass,
            'location': getRegionLocation(region),
            'databaseEngine': 'MySQL', // simplified for demo
            'deploymentOption': 'Single-AZ'
        }
    });

    if (hourlyRate === null) hourlyRate = 0;

    const storageRate = 0.115; // Keeping constant for storage as it varies wildly by type (io1, gp2, etc)

    const computeCost = hourlyRate * USAGE_DEFAULTS.hours_per_month;
    const storageCost = storageSize * storageRate;

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'RDS Database',
        region,
        monthlyCost: computeCost + storageCost,
        breakdown: [
            { unit: 'hours', rate: hourlyRate, quantity: USAGE_DEFAULTS.hours_per_month, description: `DB Instance (${instanceClass})` },
            { unit: 'GB-Month', rate: storageRate, quantity: storageSize, description: 'Storage' }
        ],
        metadata: { instanceClass, engine }
    };
};

const calculateS3Cost = async (resource: TfResourceChange): Promise<CostItem> => {
    const bucketName = resource.change.after.bucket || resource.name;
    const assumedSize = USAGE_DEFAULTS.s3_storage_gb;
    const rate = 0.023; // Standard S3 is fairly stable, API querying for tiered storage is complex
    
    return {
        id: resource.address,
        resourceName: bucketName,
        resourceType: 'S3 Bucket',
        region: 'us-east-1',
        monthlyCost: assumedSize * rate,
        breakdown: [
            { unit: 'GB-Month', rate: rate, quantity: assumedSize, description: 'Standard Storage (Estimated)' }
        ],
        metadata: { bucketName }
    };
};

const calculateLBCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const type = resource.change.after.load_balancer_type || 'application';
    // Load Balancer pricing is often flat hourly + LCU.
    // We will simulate a fetch or use standard known rates if API fails
    const hourlyRate = 0.0225;
    const lcuRate = 0.008;

    const hourlyCost = hourlyRate * USAGE_DEFAULTS.hours_per_month;
    const lcuCost = lcuRate * USAGE_DEFAULTS.alb_lcu * USAGE_DEFAULTS.hours_per_month;

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: `Load Balancer (${type})`,
        region: 'us-east-1',
        monthlyCost: hourlyCost + lcuCost,
        breakdown: [
            { unit: 'hours', rate: hourlyRate, quantity: USAGE_DEFAULTS.hours_per_month, description: 'Hourly Charge' },
            { unit: 'LCU-hours', rate: lcuRate, quantity: USAGE_DEFAULTS.alb_lcu * USAGE_DEFAULTS.hours_per_month, description: 'LCU Usage (Estimated)' }
        ],
        metadata: { type }
    };
};

export const generateCostReport = async (resources: TfResourceChange[]): Promise<CostReport> => {
    const items: CostItem[] = [];
    const summaryByService: Record<string, number> = {};

    // Process in parallel
    const promises = resources.map(async (r) => {
        // Skip if deleting (for current state projection)
        if (r.change.actions.includes('delete') && !r.change.actions.includes('create')) return null;

        if (r.type === 'aws_instance') return await calculateEC2Cost(r);
        if (r.type === 'aws_db_instance') return await calculateRDSCost(r);
        if (r.type === 'aws_s3_bucket') return await calculateS3Cost(r);
        if (r.type === 'aws_lb' || r.type === 'aws_alb') return await calculateLBCost(r);
        return null;
    });

    const results = await Promise.all(promises);

    results.forEach(item => {
        if (item) {
            items.push(item);
            summaryByService[item.resourceType] = (summaryByService[item.resourceType] || 0) + item.monthlyCost;
        }
    });

    const totalMonthlyCost = items.reduce((acc, i) => acc + i.monthlyCost, 0);

    return {
        totalMonthlyCost,
        currency: 'USD',
        items,
        summaryByService
    };
};

export const generateDiffReport = async (oldPlanResources: TfResourceChange[], newPlanResources: TfResourceChange[]): Promise<DiffReport> => {
    const oldReport = await generateCostReport(oldPlanResources);
    const newReport = await generateCostReport(newPlanResources);

    const addedItems: CostItem[] = [];
    const removedItems: CostItem[] = [];
    const modifiedItems: any[] = [];

    const oldMap = new Map(oldReport.items.map(i => [i.id, i]));
    const newMap = new Map(newReport.items.map(i => [i.id, i]));

    newReport.items.forEach(newItem => {
        if (!oldMap.has(newItem.id)) {
            addedItems.push(newItem);
        } else {
            const oldItem = oldMap.get(newItem.id)!;
            if (Math.abs(oldItem.monthlyCost - newItem.monthlyCost) > 0.01) {
                modifiedItems.push({
                    resourceName: newItem.resourceName,
                    oldCost: oldItem.monthlyCost,
                    newCost: newItem.monthlyCost,
                    diff: newItem.monthlyCost - oldItem.monthlyCost
                });
            }
        }
    });

    oldReport.items.forEach(oldItem => {
        if (!newMap.has(oldItem.id)) {
            removedItems.push(oldItem);
        }
    });

    return {
        oldCost: oldReport.totalMonthlyCost,
        newCost: newReport.totalMonthlyCost,
        diff: newReport.totalMonthlyCost - oldReport.totalMonthlyCost,
        percentChange: oldReport.totalMonthlyCost > 0 
            ? ((newReport.totalMonthlyCost - oldReport.totalMonthlyCost) / oldReport.totalMonthlyCost) * 100 
            : 100,
        addedItems,
        removedItems,
        modifiedItems
    };
};
