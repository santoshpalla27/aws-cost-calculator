import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const hcl = require('hcl2-parser');

import fs from 'fs/promises';
import path from 'path';
import logger from '../config/logger.config.js';

export class TerraformParserService {
  constructor() {
    this.parsedData = {
      resources: [],
      modules: [],
      variables: {},
      locals: {},
      dataSource: {},
      outputs: {}
    };
  }

  async parseDirectory(dirPath) {
    try {
      logger.info(`Parsing directory: ${dirPath}`);
      
      // Parse all .tf files recursively
      await this.parseDirectoryRecursive(dirPath);
      
      logger.info(`Parsed data summary: ${this.parsedData.resources.length} resources found.`);
      
      // Resolve references after all files are parsed
      this.resolveReferences();
      
      return this.parsedData;
    } catch (error) {
      logger.error('Error parsing Terraform directory:', error);
      throw new Error(`Failed to parse Terraform files: ${error.message}`);
    }
  }

  async parseDirectoryRecursive(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__MACOSX') {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively parse subdirectories
          await this.parseDirectoryRecursive(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tf') || entry.name.endsWith('.tfvars'))) {
          // Parse Terraform files
          await this.parseFile(fullPath);
        }
      }
    } catch (error) {
      logger.error(`Error reading directory ${dirPath}:`, error);
    }
  }

  async parseFile(filePath) {
    try {
      logger.info(`Parsing file: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      
      logger.info(`File content length: ${content.length} bytes`);
      logger.info(`First 200 chars: ${content.substring(0, 200)}`);
      
      // Attempt to parse
      let parsed;
      try {
        if (typeof hcl.parseToObject === 'function') {
          parsed = hcl.parseToObject(content);
        } else {
          logger.error(`hcl2-parser does not have parseToObject. Keys: ${Object.keys(hcl)}`);
          throw new Error('hcl2-parser interface mismatch');
        }
      } catch (parseError) {
        logger.error(`HCL Parse error for ${filePath}:`, parseError);
        return; // Skip file if parsing fails
      }
      
      // Log the raw parsed output
      logger.info(`Raw parsed content for ${path.basename(filePath)}: ${JSON.stringify(parsed, null, 2)}`);

      if (!parsed) return;
      
      // Handle both array and object responses
      let parsedObj;
      if (Array.isArray(parsed)) {
        // Filter out null values and merge all objects
        const validObjects = parsed.filter(item => item !== null && typeof item === 'object');
        if (validObjects.length === 0) {
          logger.warn(`No valid parsed objects in ${filePath}`);
          return;
        }
        
        // Merge all objects
        parsedObj = validObjects.reduce((acc, obj) => {
          Object.keys(obj).forEach(key => {
            if (!acc[key]) {
              acc[key] = obj[key];
            } else {
              // Merge if both are objects
              if (typeof acc[key] === 'object' && typeof obj[key] === 'object') {
                acc[key] = { ...acc[key], ...obj[key] };
              }
            }
          });
          return acc;
        }, {});
      } else {
        parsedObj = parsed;
      }

      logger.info(`Processing parsed object keys: ${Object.keys(parsedObj).join(', ')}`);

      // Extract resources
      if (parsedObj.resource) {
        logger.info(`Found resources in ${filePath}`);
        for (const [resourceType, resources] of Object.entries(parsedObj.resource)) {
          // Handle both array and object format
          const resourceList = Array.isArray(resources) ? resources : [resources];
          
          for (const resourceObj of resourceList) {
            for (const [resourceName, config] of Object.entries(resourceObj)) {
              logger.info(`Adding resource: ${resourceType}.${resourceName}`);
              this.parsedData.resources.push({
                type: resourceType,
                name: resourceName,
                config: config,
                file: filePath
              });
            }
          }
        }
      }

      // Extract variables
      if (parsedObj.variable) {
        const varList = Array.isArray(parsedObj.variable) ? parsedObj.variable : [parsedObj.variable];
        for (const varObj of varList) {
          this.parsedData.variables = {
            ...this.parsedData.variables,
            ...varObj
          };
        }
      }

      // Extract locals
      if (parsedObj.locals) {
        const localsList = Array.isArray(parsedObj.locals) ? parsedObj.locals : [parsedObj.locals];
        for (const localsObj of localsList) {
          this.parsedData.locals = {
            ...this.parsedData.locals,
            ...localsObj
          };
        }
      }

      // Extract data sources
      if (parsedObj.data) {
        for (const [dataType, dataSources] of Object.entries(parsedObj.data)) {
          const dataList = Array.isArray(dataSources) ? dataSources : [dataSources];
          
          for (const dataObj of dataList) {
            for (const [dataName, config] of Object.entries(dataObj)) {
              this.parsedData.dataSource[`${dataType}.${dataName}`] = config;
            }
          }
        }
      }

      // Extract modules
      if (parsedObj.module) {
        const moduleList = Array.isArray(parsedObj.module) ? parsedObj.module : [parsedObj.module];
        
        for (const moduleObj of moduleList) {
          for (const [moduleName, moduleConfig] of Object.entries(moduleObj)) {
            this.parsedData.modules.push({
              name: moduleName,
              source: moduleConfig.source,
              config: moduleConfig,
              file: filePath
            });
          }
        }
      }

      // Extract outputs
      if (parsedObj.output) {
        const outputList = Array.isArray(parsedObj.output) ? parsedObj.output : [parsedObj.output];
        for (const outputObj of outputList) {
          this.parsedData.outputs = {
            ...this.parsedData.outputs,
            ...outputObj
          };
        }
      }

    } catch (error) {
      logger.error(`Error parsing file ${filePath}:`, error);
      // Don't throw, just log and continue with other files
    }
  }

  resolveReferences() {
    // Resolve variable references in resource configurations
    for (const resource of this.parsedData.resources) {
      resource.config = this.resolveConfigReferences(resource.config);
    }
  }

  resolveConfigReferences(config, depth = 0) {
    if (depth > 10) return config; // Prevent infinite recursion

    if (typeof config === 'string') {
      return this.resolveStringReference(config);
    }

    if (Array.isArray(config)) {
      return config.map(item => this.resolveConfigReferences(item, depth + 1));
    }

    if (typeof config === 'object' && config !== null) {
      const resolved = {};
      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolveConfigReferences(value, depth + 1);
      }
      return resolved;
    }

    return config;
  }

  resolveStringReference(str) {
    if (typeof str !== 'string') return str;
    
    // Remove \${} wrapper if present
    let cleanStr = str.replace(/^\\$\\{(.*)\\\}\$/, '$1');
    
    // Handle var.xxx references
    const varMatch = cleanStr.match(/^var\.([^.]+)\\/);
    if (varMatch) {
      const varName = varMatch[1];
      if (this.parsedData.variables[varName]) {
        const varData = Array.isArray(this.parsedData.variables[varName]) 
          ? this.parsedData.variables[varName][0] 
          : this.parsedData.variables[varName];
        
        if (varData && varData.default !== undefined) {
          return varData.default;
        }
      }
    }

    // Handle local.xxx references
    const localMatch = cleanStr.match(/^local\.([^.]+)\\/);
    if (localMatch) {
      const localName = localMatch[1];
      if (this.parsedData.locals[localName] !== undefined) {
        return this.parsedData.locals[localName];
      }
    }

    return str; // Return original if no resolution
  }

  getResourcesByType(type) {
    return this.parsedData.resources.filter(r => r.type === type);
  }

  getAllResources() {
    return this.parsedData.resources;
  }
}
