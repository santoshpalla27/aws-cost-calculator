import { TfResourceChange, CostItem, CostReport, DiffReport } from '../types';
import { fetchPrice, getRegionLocation } from './pricingService';

const HOURS_PER_MONTH = 730;

// ==================== EC2 ====================
const calculateEC2Cost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const instanceType = after.instance_type || 't3.micro';
    const region = after.availability_zone?.slice(0, -1) || 'us-east-1';
    
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

// ==================== RDS ====================
const calculateRDSCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const instanceClass = after.instance_class || 'db.t3.micro';
    const storageSize = after.allocated_storage || 20;
    const storageType = after.storage_type || 'gp2';
    const engine = after.engine || 'mysql';
    const multiAZ = after.multi_az || false;
    const region = 'us-east-1';

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

// ==================== S3 ====================
const calculateS3Cost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const bucketName = after.bucket || resource.name;
    
    const storageClass = after.lifecycle_rule?.[0]?.transition?.storage_class || 'STANDARD';
    const estimatedGB = 100;
    
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
        metadata: { bucketName, storageClass, note: 'Storage size estimated' }
    };
};

// ==================== Lambda ====================
const calculateLambdaCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const memory = after.memory_size || 128;
    const timeout = after.timeout || 3;
    
    const monthlyInvocations = 1000000;
    const avgDuration = timeout * 0.5;
    
    const requestRate = 0.20 / 1000000;
    const computeGBSeconds = (memory / 1024) * avgDuration * monthlyInvocations;
    const computeRate = 0.0000166667;
    
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
            { unit: 'GB-seconds', rate: computeRate, quantity: computeGBSeconds, description: `Compute (${memory}MB)` }
        ],
        metadata: { memory, timeout, note: 'Based on estimated usage' }
    };
};

// ==================== DynamoDB ====================
const calculateDynamoDBCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const billingMode = after.billing_mode || 'PROVISIONED';
    
    if (billingMode === 'PAY_PER_REQUEST') {
        const estimatedWRU = 1000000;
        const estimatedRRU = 1000000;
        
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
            metadata: { billingMode, note: 'Estimates - use CloudWatch for actual' }
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

// ==================== Load Balancer ====================
const calculateLBCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const type = after.load_balancer_type || 'application';
    
    const pricing: Record<string, { hourly: number, lcu: number }> = {
        'application': { hourly: 0.0225, lcu: 0.008 },
        'network': { hourly: 0.0225, lcu: 0.006 },
        'gateway': { hourly: 0.0125, lcu: 0.004 }
    };

    const rates = pricing[type] || pricing['application'];
    const estimatedLCU = 1;

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
        metadata: { type, note: 'LCU usage estimated' }
    };
};

// ==================== NAT Gateway ====================
const calculateNatGatewayCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const hourlyRate = 0.045;
    const dataRate = 0.045;
    const estimatedGB = 100;

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
        metadata: { note: 'Data processing estimated' }
    };
};

// ==================== EKS ====================
const calculateEKSCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const hourlyRate = 0.10;

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

// ==================== ElastiCache ====================
const calculateElastiCacheCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const nodeType = after.node_type || 'cache.t3.micro';
    const numNodes = after.num_cache_nodes || 1;
    const engine = after.engine || 'redis';

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

// ==================== CloudFront ====================
const calculateCloudFrontCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const estimatedGB = 1000;
    const estimatedRequests = 10000000;

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
        metadata: { note: 'Usage estimated - actual costs vary' }
    };
};

// ==================== Route53 ====================
const calculateRoute53Cost = async (resource: TfResourceChange): Promise<CostItem> => {
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'Route53 Hosted Zone',
        region: 'global',
        monthlyCost: 0.50,
        breakdown: [
            { unit: 'zone', rate: 0.50, quantity: 1, description: 'Hosted Zone' }
        ],
        metadata: {}
    };
};

// ==================== Auto Scaling Group ====================
const calculateASGCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const minSize = after.min_size || 1;
    const desiredCapacity = after.desired_capacity || minSize;
    
    // ASG itself is free, but we estimate EC2 costs
    // We need the launch template/config to get instance type
    const instanceType = 't3.micro'; // Default fallback

    let hourlyRate = await fetchPrice({
        serviceCode: 'AmazonEC2',
        filters: {
            'instanceType': instanceType,
            'location': getRegionLocation('us-east-1'),
            'tenancy': 'Shared',
            'operatingSystem': 'Linux',
            'preInstalledSw': 'NA',
            'capacitystatus': 'Used'
        },
        resourceType: 'EC2 Instance'
    });

    if (hourlyRate === null) hourlyRate = 0.0116;

    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'Auto Scaling Group',
        region: 'us-east-1',
        monthlyCost: hourlyRate * HOURS_PER_MONTH * desiredCapacity,
        breakdown: [
            { unit: 'instance-hours', rate: hourlyRate, quantity: HOURS_PER_MONTH * desiredCapacity, description: `EC2 Instances (${instanceType}) x ${desiredCapacity}` }
        ],
        metadata: { instanceType, desiredCapacity, note: 'ASG service is free, showing estimated EC2 costs' }
    };
};

// ==================== CloudWatch Alarm ====================
const calculateCloudWatchAlarmCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'CloudWatch Alarm',
        region: 'us-east-1',
        monthlyCost: 0.10,
        breakdown: [
            { unit: 'alarm', rate: 0.10, quantity: 1, description: 'Standard Metric Alarm' }
        ],
        metadata: {}
    };
};

// ==================== Launch Template ====================
const calculateLaunchTemplateCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'Launch Template',
        region: 'us-east-1',
        monthlyCost: 0,
        breakdown: [
            { unit: 'template', rate: 0, quantity: 1, description: 'Launch Template (Free)' }
        ],
        metadata: { note: 'Launch Templates are free - EC2 costs calculated separately' }
    };
};

// ==================== Target Group ====================
const calculateTargetGroupCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'Target Group',
        region: 'us-east-1',
        monthlyCost: 0,
        breakdown: [
            { unit: 'target-group', rate: 0, quantity: 1, description: 'Target Group (Free)' }
        ],
        metadata: { note: 'Target Groups are free - LB costs calculated separately' }
    };
};

// ==================== LB Listener ====================
const calculateLBListenerCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'LB Listener',
        region: 'us-east-1',
        monthlyCost: 0,
        breakdown: [
            { unit: 'listener', rate: 0, quantity: 1, description: 'LB Listener (Free)' }
        ],
        metadata: { note: 'Listeners are free - LB costs calculated separately' }
    };
};

// ==================== EIP ====================
const calculateEIPCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const after = resource.change.after || {};
    const isAttached = !!after.instance || !!after.network_interface;
    
    // Free when attached, $0.005/hr when not attached
    const hourlyRate = isAttached ? 0 : 0.005;
    
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: 'Elastic IP',
        region: 'us-east-1',
        monthlyCost: hourlyRate * HOURS_PER_MONTH,
        breakdown: [
            { unit: 'hours', rate: hourlyRate, quantity: HOURS_PER_MONTH, description: isAttached ? 'Attached (Free)' : 'Unattached' }
        ],
        metadata: { isAttached }
    };
};

// ==================== Free/No-Cost Resources ====================
const createFreeResource = (resource: TfResourceChange, displayType: string): CostItem => {
    return {
        id: resource.address,
        resourceName: resource.name,
        resourceType: displayType,
        region: 'us-east-1',
        monthlyCost: 0,
        breakdown: [
            { unit: 'resource', rate: 0, quantity: 1, description: `${displayType} (No charge)` }
        ],
        metadata: { note: 'This resource type has no direct cost' }
    };
};

// ==================== Auto Scaling Policy ====================
const calculateASGPolicyCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'Auto Scaling Policy');
};

// ==================== IAM Resources ====================
const calculateIAMCost = async (resource: TfResourceChange): Promise<CostItem> => {
    const typeMap: Record<string, string> = {
        'aws_iam_role': 'IAM Role',
        'aws_iam_policy': 'IAM Policy',
        'aws_iam_instance_profile': 'IAM Instance Profile',
        'aws_iam_role_policy_attachment': 'IAM Policy Attachment'
    };
    return createFreeResource(resource, typeMap[resource.type] || 'IAM Resource');
};

// ==================== VPC Resources ====================
const calculateVPCCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'VPC');
};

const calculateSubnetCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'Subnet');
};

const calculateInternetGatewayCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'Internet Gateway');
};

const calculateRouteTableCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'Route Table');
};

const calculateRouteTableAssociationCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'Route Table Association');
};

const calculateSecurityGroupCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'Security Group');
};

const calculateDBSubnetGroupCost = async (resource: TfResourceChange): Promise<CostItem> => {
    return createFreeResource(resource, 'DB Subnet Group');
};

// ==================== Main Report Generation ====================
export const generateCostReport = async (resources: TfResourceChange[]): Promise<CostReport> => {
    const items: CostItem[] = [];
    const errors: any[] = [];
    const summaryByService: Record<string, number> = {};

    const calculators: Record<string, (resource: TfResourceChange) => Promise<CostItem>> = {
        // Compute
        'aws_instance': calculateEC2Cost,
        'aws_autoscaling_group': calculateASGCost,
        'aws_launch_template': calculateLaunchTemplateCost,
        'aws_autoscaling_policy': calculateASGPolicyCost,
        
        // Database
        'aws_db_instance': calculateRDSCost,
        'aws_db_subnet_group': calculateDBSubnetGroupCost,
        'aws_elasticache_cluster': calculateElastiCacheCost,
        'aws_dynamodb_table': calculateDynamoDBCost,
        
        // Storage
        'aws_s3_bucket': calculateS3Cost,
        
        // Serverless
        'aws_lambda_function': calculateLambdaCost,
        
        // Networking
        'aws_lb': calculateLBCost,
        'aws_alb': calculateLBCost,
        'aws_nlb': calculateLBCost,
        'aws_lb_target_group': calculateTargetGroupCost,
        'aws_lb_listener': calculateLBListenerCost,
        'aws_nat_gateway': calculateNatGatewayCost,
        'aws_eip': calculateEIPCost,
        'aws_vpc': calculateVPCCost,
        'aws_subnet': calculateSubnetCost,
        'aws_internet_gateway': calculateInternetGatewayCost,
        'aws_route_table': calculateRouteTableCost,
        'aws_route_table_association': calculateRouteTableAssociationCost,
        'aws_security_group': calculateSecurityGroupCost,
        
        // Container & Orchestration
        'aws_eks_cluster': calculateEKSCost,
        
        // CDN & DNS
        'aws_cloudfront_distribution': calculateCloudFrontCost,
        'aws_route53_zone': calculateRoute53Cost,
        
        // Monitoring
        'aws_cloudwatch_metric_alarm': calculateCloudWatchAlarmCost,
        
        // IAM (All Free)
        'aws_iam_role': calculateIAMCost,
        'aws_iam_policy': calculateIAMCost,
        'aws_iam_instance_profile': calculateIAMCost,
        'aws_iam_role_policy_attachment': calculateIAMCost
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