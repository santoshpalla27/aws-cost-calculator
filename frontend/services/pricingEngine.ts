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
        const type = resource.change.after.root_block_device[0].volume_type || 'gp2';

        let storageRate = 0.10; // Default for gp2/gp3 in us-east-1
        if (type === 'gp3') storageRate = 0.08;

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
    const hourlyRate = 0.0225;
    const lcuRate = 0.008;

    // Assume minimal LCU usage for baseline to match Infracost
    const lcuUsage = 0;

    const hourlyCost = hourlyRate * USAGE_DEFAULTS.hours_per_month;
    const lcuCost = lcuRate * lcuUsage * USAGE_DEFAULTS.hours_per_month;

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: `Load Balancer (${type})`,
        region: 'us-east-1',
        monthlyCost: hourlyCost + lcuCost,
        breakdown: [
            { unit: 'hours', rate: hourlyRate, quantity: USAGE_DEFAULTS.hours_per_month, description: 'Hourly Charge' },
            { unit: 'LCU-hours', rate: lcuRate, quantity: lcuUsage, description: 'LCU Usage (Baseline)' }
        ],
        metadata: { type }
    };
};

const calculateNatGatewayCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const region = 'us-east-1';
    const hourlyRate = 0.045;
    const dataRate = 0.045;
    const processedGB = 0; // Baseline assumption

    const monthlyCost = (hourlyRate * USAGE_DEFAULTS.hours_per_month) + (dataRate * processedGB);

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'NAT Gateway',
        region,
        monthlyCost,
        breakdown: [
            { unit: 'hours', rate: hourlyRate, quantity: USAGE_DEFAULTS.hours_per_month, description: 'NAT Gateway Hourly' },
            { unit: 'GB', rate: dataRate, quantity: processedGB, description: 'Data Processed (Baseline)' }
        ],
        metadata: {}
    };
};

const calculateCloudWatchCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const region = 'us-east-1';
    const rate = 0.10; // Standard resolution alarm

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'CloudWatch Alarm',
        region,
        monthlyCost: rate,
        breakdown: [
            { unit: 'alarm', rate: rate, quantity: 1, description: 'Standard Resolution Alarm' }
        ],
        metadata: {}
    };
};

const calculateASGCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const region = 'us-east-1';
    // Simplified: Assume t2.micro if not found (parsing launch template is complex without state)
    const instanceType = 't2.micro';
    const minSize = resource.change.after.min_size || 1;
    const desiredCapacity = resource.change.after.desired_capacity || minSize;

    // Fetch Compute Price
    let hourlyRate = await fetchPrice({
        serviceCode: 'AmazonEC2',
        filters: getEC2Filters(instanceType, region)
    });
    if (hourlyRate === null) hourlyRate = 0.0116; // t2.micro fallback

    const totalInstances = desiredCapacity;
    const monthlyCost = hourlyRate * USAGE_DEFAULTS.hours_per_month * totalInstances;

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'Auto Scaling Group',
        region,
        monthlyCost,
        breakdown: [
            {
                unit: 'hours',
                rate: hourlyRate,
                quantity: USAGE_DEFAULTS.hours_per_month * totalInstances,
                description: `EC2 Usage (${instanceType}) x ${totalInstances}`
            }
        ],
        metadata: { instanceType, count: totalInstances }
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
        if (r.type === 'aws_nat_gateway') return await calculateNatGatewayCost(r);
        if (r.type === 'aws_cloudwatch_metric_alarm') return await calculateCloudWatchCost(r);
        if (r.type === 'aws_autoscaling_group') return await calculateASGCost(r);
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
