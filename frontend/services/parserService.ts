import { TfPlan, TfResourceChange } from '../types';

export const parseTerraformPlan = (jsonContent: string): TfPlan | null => {
    try {
        const parsed = JSON.parse(jsonContent);
        // Basic validation for TF Plan JSON
        if (!parsed.resource_changes && !parsed.planned_values) {
            console.warn("JSON does not look like a Terraform Plan. Attempting to parse as single resource list if applicable.");
            return null;
        }
        return parsed as TfPlan;
    } catch (e) {
        // Not a JSON file, likely HCL content passed by mistake to this function
        return null;
    }
};

export const filterManagedResources = (plan: TfPlan): TfResourceChange[] => {
    if (!plan.resource_changes) {
        console.warn("Plan has no resource_changes:", plan);
        return [];
    }

    console.log("Raw Plan Resource Changes:", plan.resource_changes);

    // Filter for managed resources (aws_*) that are being created, updated, or deleted.
    // Terraform's 'resource_changes' array contains an entry for EACH instance of a resource.
    // e.g. aws_instance.web[0], aws_instance.web[1] are separate entries.
    const filtered = plan.resource_changes.filter(r => {
        const isManaged = r.type.startsWith('aws_');
        const isChange = r.change.actions.includes('create') ||
            r.change.actions.includes('update') ||
            r.change.actions.includes('delete');
        return isManaged && isChange;
    });

    console.log(`Found ${filtered.length} managed resources.`);
    return filtered;
};

// --- HCL Static Analysis Logic ---

/**
 * Parses raw HCL content from .tf files to extract resource definitions.
 * This is a lightweight static analysis, not a full HCL parser.
 * It ignores variables and modules, utilizing defaults for pricing.
 */
export const parseHclFiles = (fileContents: string[]): TfResourceChange[] => {
    const combinedContent = fileContents.join('\n');
    const resources: TfResourceChange[] = [];

    // Regex to find resource blocks: resource "type" "name" { ... }
    // Handles loose whitespace
    const resourceBlockRegex = /resource\s+"(aws_[\w]+)"\s+"([\w]+)"\s*\{/g;

    let match;
    while ((match = resourceBlockRegex.exec(combinedContent)) !== null) {
        const type = match[1];
        const name = match[2];
        const startIndex = match.index + match[0].length;

        // Extract the block content (string-aware brace matching)
        const blockContent = extractBlock(combinedContent, startIndex - 1); // Start from the opening brace
        const config = parseBlockAttributes(blockContent);

        resources.push({
            address: `${type}.${name}`,
            type: type,
            name: name,
            change: {
                actions: ['create'], // Assume creation for static analysis
                before: null,
                after: config
            }
        });
    }

    return resources;
};

/**
 * Helper to extract content inside { ... } handling nested braces and ignoring braces inside strings
 */
const extractBlock = (str: string, openBraceIndex: number): string => {
    let braceCount = 1; // We assume starting at the char *after* the first {
    let index = openBraceIndex + 1; // Start scanning after the first {
    let inString = false;
    let stringChar = '';

    while (braceCount > 0 && index < str.length) {
        const char = str[index];

        if (inString) {
            if (char === stringChar && str[index - 1] !== '\\') {
                inString = false;
            }
        } else {
            if (char === '"' || char === "'") {
                inString = true;
                stringChar = char;
            } else if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
            }
        }
        index++;
    }

    // Return content inside the outer braces
    return str.substring(openBraceIndex + 1, index - 1);
};

/**
 * Parses simple key = "value" or key = number attributes from HCL body
 */
const parseBlockAttributes = (block: string): any => {
    const config: any = {};

    // Clean comments (hash and double slash)
    const cleanBlock = block.replace(/#.*$/gm, '').replace(/\/\/.*$/gm, '');

    // Match string values: key = "value"
    const stringRegex = /([a-z0-9_]+)\s*=\s*"([^"]+)"/g;
    let sMatch;
    while ((sMatch = stringRegex.exec(cleanBlock)) !== null) {
        config[sMatch[1]] = sMatch[2];
    }

    // Match number values: key = 123
    const numberRegex = /([a-z0-9_]+)\s*=\s*([0-9]+)/g;
    let nMatch;
    while ((nMatch = numberRegex.exec(cleanBlock)) !== null) {
        config[nMatch[1]] = parseInt(nMatch[2]);
    }

    // Special handling for EBS block devices (simplified)
    if (cleanBlock.includes('root_block_device')) {
        // Mock a root block device if the keyword exists
        config.root_block_device = [{
            volume_type: 'gp3', // default
            volume_size: 8 // default
        }];

        // Try to extract actual size if defined in root_block_device
        const volSize = cleanBlock.match(/volume_size\s*=\s*([0-9]+)/);
        if (volSize) {
            config.root_block_device[0].volume_size = parseInt(volSize[1]);
        }
        const volType = cleanBlock.match(/volume_type\s*=\s*"([^"]+)"/);
        if (volType) {
            config.root_block_device[0].volume_type = volType[1];
        }
    }

    return config;
};