import { TfResourceChange, CostItem, CostReport, DiffReport } from '../types'; import { fetchPrice, getRegionLocation } from './pricingService';

const HOURS_PER_MONTH = 730; // Standard AWS calculation

// ==================== EC2 ==================== const calculateEC2Cost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const instanceType = after.instance_type || 't3.micro'; const region = after.availability_zone?.slice(0, -1) || 'us-east-1';

let hourlyRate = await fetchPrice({
    serviceCode: 'AmazonEC2',
    filters: {
        'instanceType': instanceType,
        'location': getRegionLocation(region),
        'tenancy': after.tenancy || 'Shared',
        'operatingSystem': after.ami?.includes('windows') ? 'Windows' : 'Linux',
        'preInstalledSw': 'NA',
        'capacitystatus': 'Used'
    },
    resourceType: 'EC2 Instance'
});

if (hourlyRate === null) {
    throw new Error(`Unable to fetch pricing for ${instanceType} in ${region}`);
}

const breakdown = [{
    unit: 'hours',
    rate: hourlyRate,
    quantity: HOURS_PER_MONTH,
    description: `Compute (${instanceType})`
}];

// EBS Volumes
const volumes = after.root_block_device || after.ebs_block_device;
if (volumes) {
    const processVolume = (vol: any) => {
        const size = vol.volume_size || 8;
        const type = vol.volume_type || 'gp3';
        const iops = vol.iops || (type === 'gp3' ? 3000 : 0);
        
        let storageRate = 0;
        switch (type) {
            case 'gp3': storageRate = 0.08; break;
            case 'gp2': storageRate = 0.10; break;
            case 'io1':
            case 'io2': storageRate = 0.125; break;
            case 'st1': storageRate = 0.045; break;
            case 'sc1': storageRate = 0.015; break;
            default: storageRate = 0.08;
        }

        breakdown.push({
            unit: 'GB-Month',
            rate: storageRate,
            quantity: size,
            description: `${type.toUpperCase()} Storage`
        });

        if (iops > 3000 && (type === 'io1' || type === 'io2')) {
            breakdown.push({
                unit: 'IOPS-Month',
                rate: 0.065,
                quantity: iops,
                description: 'Provisioned IOPS'
            });
        }
    };

    if (Array.isArray(volumes)) {
        volumes.forEach(processVolume);
    } else {
        processVolume(volumes);
    }
}

const total = breakdown.reduce((acc, item) => acc + (item.rate * item.quantity), 0);

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'EC2 Instance',
    region,
    monthlyCost: total,
    breakdown,
    metadata: { instanceType, region }
};
};

// ==================== RDS ==================== const calculateRDSCost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const instanceClass = after.instance_class || 'db.t3.micro'; const storageSize = after.allocated_storage || 20; const storageType = after.storage_type || 'gp2'; const engine = after.engine || 'mysql'; const multiAZ = after.multi_az || false; const region = 'us-east-1';

// Engine mapping for AWS Pricing API
const engineMap: Record<string, string> = {
    'mysql': 'MySQL',
    'postgres': 'PostgreSQL',
    'mariadb': 'MariaDB',
    'oracle': 'Oracle',
    'sqlserver': 'SQL Server'
};

let hourlyRate = await fetchPrice({
    serviceCode: 'AmazonRDS',
    filters: {
        'instanceType': instanceClass,
        'location': getRegionLocation(region),
        'databaseEngine': engineMap[engine] || 'MySQL',
        'deploymentOption': multiAZ ? 'Multi-AZ' : 'Single-AZ'
    },
    resourceType: 'RDS Instance'
});

if (hourlyRate === null) {
    throw new Error(`Unable to fetch RDS pricing for ${instanceClass}`);
}

const computeCost = hourlyRate * HOURS_PER_MONTH;

let storageRate = 0.115;
if (storageType === 'gp3') storageRate = 0.096;
else if (storageType === 'io1') storageRate = 0.125;

const storageCost = storageSize * storageRate;

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'RDS Database',
    region,
    monthlyCost: computeCost + storageCost,
    breakdown: [
        { unit: 'hours', rate: hourlyRate, quantity: HOURS_PER_MONTH, description: `DB Instance (${instanceClass})` },
        { unit: 'GB-Month', rate: storageRate, quantity: storageSize, description: `Storage (${storageType})` }
    ],
    metadata: { instanceClass, engine, multiAZ }
};
};

// ==================== S3 ==================== const calculateS3Cost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const bucketName = after.bucket || resource.name;

// Try to detect storage class from lifecycle rules or defaults
const storageClass = after.lifecycle_rule?.[0]?.transition?.storage_class || 'STANDARD';

// Estimate storage (this should ideally come from usage data)
const estimatedGB = 100; // Default assumption

const storageRates: Record<string, number> = {
    'STANDARD': 0.023,
    'INTELLIGENT_TIERING': 0.023,
    'STANDARD_IA': 0.0125,
    'ONEZONE_IA': 0.01,
    'GLACIER': 0.004,
    'GLACIER_IR': 0.004,
    'DEEP_ARCHIVE': 0.00099
};

const rate = storageRates[storageClass] || storageRates['STANDARD'];

return {
    id: resource.address,
    resourceName: bucketName,
    resourceType: 'S3 Bucket',
    region: 'us-east-1',
    monthlyCost: estimatedGB * rate,
    breakdown: [
        { unit: 'GB-Month', rate, quantity: estimatedGB, description: `${storageClass} Storage (Estimated)` }
    ],
    metadata: { bucketName, storageClass, note: 'Storage size estimated - use CloudWatch metrics for accuracy' }
};
};

// ==================== Lambda ==================== const calculateLambdaCost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const memory = after.memory_size || 128; const timeout = after.timeout || 3;

// Estimates (should come from CloudWatch in production)
const monthlyInvocations = 1000000;
const avgDuration = timeout * 0.5; // Assume 50% of timeout used

// Lambda pricing
const requestRate = 0.20 / 1000000; // $0.20 per 1M requests
const computeGBSeconds = (memory / 1024) * avgDuration * monthlyInvocations;
const computeRate = 0.0000166667; // per GB-second

const requestCost = monthlyInvocations * requestRate;
const computeCost = computeGBSeconds * computeRate;

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'Lambda Function',
    region: 'us-east-1',
    monthlyCost: requestCost + computeCost,
    breakdown: [
        { unit: 'requests', rate: requestRate, quantity: monthlyInvocations, description: 'Invocations (Estimated)' },
        { unit: 'GB-seconds', rate: computeRate, quantity: computeGBSeconds, description: `Compute (${memory}MB, ${avgDuration}s avg)` }
    ],
    metadata: { memory, timeout, note: 'Based on estimated usage - configure actual metrics for accuracy' }
};
};

// ==================== DynamoDB ==================== const calculateDynamoDBCost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const billingMode = after.billing_mode || 'PROVISIONED';

if (billingMode === 'PAY_PER_REQUEST') {
    // On-demand pricing
    const estimatedWRU = 1000000; // Write request units
    const estimatedRRU = 1000000; // Read request units
    
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'DynamoDB Table',
        region: 'us-east-1',
        monthlyCost: (estimatedWRU * 1.25 / 1000000) + (estimatedRRU * 0.25 / 1000000),
        breakdown: [
            { unit: 'WRU', rate: 1.25 / 1000000, quantity: estimatedWRU, description: 'Write Requests (Estimated)' },
            { unit: 'RRU', rate: 0.25 / 1000000, quantity: estimatedRRU, description: 'Read Requests (Estimated)' }
        ],
        metadata: { billingMode, note: 'Estimates - use CloudWatch for actual RCU/WCU' }
    };
} else {
    const readCapacity = after.read_capacity || 5;
    const writeCapacity = after.write_capacity || 5;
    
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'DynamoDB Table',
        region: 'us-east-1',
        monthlyCost: (readCapacity * 0.00013 * HOURS_PER_MONTH) + (writeCapacity * 0.00065 * HOURS_PER_MONTH),
        breakdown: [
            { unit: 'RCU-hours', rate: 0.00013, quantity: readCapacity * HOURS_PER_MONTH, description: 'Read Capacity' },
            { unit: 'WCU-hours', rate: 0.00065, quantity: writeCapacity * HOURS_PER_MONTH, description: 'Write Capacity' }
        ],
        metadata: { readCapacity, writeCapacity, billingMode }
    };
}
};

// ==================== ELB/ALB/NLB ==================== const calculateLBCost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const type = after.load_balancer_type || 'application';

const pricing: Record<string, { hourly: number, lcu: number }> = {
    'application': { hourly: 0.0225, lcu: 0.008 },
    'network': { hourly: 0.0225, lcu: 0.006 },
    'gateway': { hourly: 0.0125, lcu: 0.004 }
};

const rates = pricing[type] || pricing['application'];
const estimatedLCU = 1; // Baseline LCU assumption

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: `Load Balancer (${type.toUpperCase()})`,
    region: 'us-east-1',
    monthlyCost: (rates.hourly * HOURS_PER_MONTH) + (rates.lcu * estimatedLCU * HOURS_PER_MONTH),
    breakdown: [
        { unit: 'hours', rate: rates.hourly, quantity: HOURS_PER_MONTH, description: 'Hourly Charge' },
        { unit: 'LCU-hours', rate: rates.lcu, quantity: estimatedLCU * HOURS_PER_MONTH, description: 'LCU Usage (Baseline)' }
    ],
    metadata: { type, note: 'LCU usage estimated - actual costs vary with traffic' }
};
};

// ==================== NAT Gateway ==================== const calculateNatGatewayCost = async (resource: TfResourceChange): Promise<CostItem> => { const hourlyRate = 0.045; const dataRate = 0.045; const estimatedGB = 100; // Default data processing estimate

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'NAT Gateway',
    region: 'us-east-1',
    monthlyCost: (hourlyRate * HOURS_PER_MONTH) + (dataRate * estimatedGB),
    breakdown: [
        { unit: 'hours', rate: hourlyRate, quantity: HOURS_PER_MONTH, description: 'NAT Gateway Hourly' },
        { unit: 'GB', rate: dataRate, quantity: estimatedGB, description: 'Data Processed (Estimated)' }
    ],
    metadata: { note: 'Data processing estimated - monitor actual usage' }
};
};

// ==================== EKS ==================== const calculateEKSCost = async (resource: TfResourceChange): Promise<CostItem> => { const hourlyRate = 0.10; // EKS cluster cost

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'EKS Cluster',
    region: 'us-east-1',
    monthlyCost: hourlyRate * HOURS_PER_MONTH,
    breakdown: [
        { unit: 'hours', rate: hourlyRate, quantity: HOURS_PER_MONTH, description: 'EKS Cluster Management' }
    ],
    metadata: { note: 'Node costs (EC2) calculated separately' }
};
};

// ==================== ElastiCache ==================== const calculateElastiCacheCost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const nodeType = after.node_type || 'cache.t3.micro'; const numNodes = after.num_cache_nodes || 1; const engine = after.engine || 'redis';

let hourlyRate = await fetchPrice({
    serviceCode: 'AmazonElastiCache',
    filters: {
        'instanceType': nodeType,
        'location': getRegionLocation('us-east-1'),
        'cacheEngine': engine === 'redis' ? 'Redis' : 'Memcached'
    },
    resourceType: 'ElastiCache Node'
});

if (hourlyRate === null) {
    throw new Error(`Unable to fetch ElastiCache pricing for ${nodeType}`);
}

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: `ElastiCache (${engine})`,
    region: 'us-east-1',
    monthlyCost: hourlyRate * HOURS_PER_MONTH * numNodes,
    breakdown: [
        { unit: 'node-hours', rate: hourlyRate, quantity: HOURS_PER_MONTH * numNodes, description: `${nodeType} x ${numNodes}` }
    ],
    metadata: { nodeType, numNodes, engine }
};
};

// ==================== CloudFront ==================== const calculateCloudFrontCost = async (resource: TfResourceChange): Promise<CostItem> => { const estimatedGB = 1000; // Data transfer estimate const estimatedRequests = 10000000; // HTTPS requests estimate

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'CloudFront Distribution',
    region: 'global',
    monthlyCost: (estimatedGB * 0.085) + (estimatedRequests * 0.0075 / 10000),
    breakdown: [
        { unit: 'GB', rate: 0.085, quantity: estimatedGB, description: 'Data Transfer (Estimated)' },
        { unit: 'requests', rate: 0.0075 / 10000, quantity: estimatedRequests, description: 'HTTPS Requests (Estimated)' }
    ],
    metadata: { note: 'Usage estimated - actual costs vary by region and traffic' }
};
};

// ==================== Route53 ==================== const calculateRoute53Cost = async (resource: TfResourceChange): Promise<CostItem> => { const after = resource.change.after || {}; const recordCount = Object.keys(after).filter(k => k.startsWith('record')).length || 25;

return {
    id: resource.address,
    resourceName: resource.name,
    resourceType: 'Route53 Hosted Zone',
    region: 'global',
    monthlyCost: 0.50 + (recordCount * 0.40 / 1000000 * 1000000), // $0.50 per zone + $0.40 per million queries
    breakdown: [
        { unit: 'zone', rate: 0.50, quantity: 1, description: 'Hosted Zone' },
        { unit: 'queries', rate: 0.40 / 1000000, quantity: 1000000, description: 'Standard Queries (Estimated)' }
    ],
    metadata: { recordCount }
};
};

// ==================== Main Report Generation ==================== export const generateCostReport = async (resources: TfResourceChange[]): Promise<CostReport> => { const items: CostItem[] = []; const errors: any[] = []; const summaryByService: Record<string, number> = {};

const calculators: Record<string, (resource: TfResourceChange) => Promise<CostItem>> = {
    'aws_instance': calculateEC2Cost,
    'aws_db_instance': calculateRDSCost,
    'aws_s3_bucket': calculateS3Cost,
    'aws_lambda_function': calculateLambdaCost,
    'aws_dynamodb_table': calculateDynamoDBCost,
    'aws_lb': calculateLBCost,
    'aws_alb': calculateLBCost,
    'aws_nlb': calculateLBCost,
    'aws_nat_gateway': calculateNatGatewayCost,
    'aws_eks_cluster': calculateEKSCost,
    'aws_elasticache_cluster': calculateElastiCacheCost,
    'aws_cloudfront_distribution': calculateCloudFrontCost,
    'aws_route53_zone': calculateRoute53Cost
};

const promises = resources.map(async (r) => {
    // Skip deletions
    if (r.change.actions.includes('delete') && !r.change.actions.includes('create')) {
        return null;
    }

    const calculator = calculators[r.type];
    if (!calculator) {
        errors.push({
            resource: r.address,
            type: r.type,
            error: 'Unsupported resource type'
        });
        return null;
    }

    try {
        return await calculator(r);
    } catch (error: any) {
        errors.push({
            resource: r.address,
            type: r.type,
            error: error.message
        });
        return null;
    }
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
    summaryByService,
    errors: errors.length > 0 ? errors : undefined
};
};

export const generateDiffReport = async (oldPlanResources: TfResourceChange[], newPlanResources: TfResourceChange[]): Promise<DiffReport> => { const oldReport = await generateCostReport(oldPlanResources); const newReport = await generateCostReport(newPlanResources);

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
