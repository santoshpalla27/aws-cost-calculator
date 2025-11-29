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
      logger.info('Parsing directory: ' + dirPath);
      
      await this.parseDirectoryRecursive(dirPath);
      
      logger.info('Parsed data summary: ' + this.parsedData.resources.length + ' resources found.');
      
      this.resolveReferences();
      this.resolveLaunchTemplateReferences(this.parsedData.resources);
      
      await this.expandModuleResources();
      
      logger.info('========================================');
      logger.info('Parsing complete!');
      logger.info('Total resources found: ' + this.parsedData.resources.length);
      logger.info('Resource breakdown:');
      
      const typeCount = {};
      for (const resource of this.parsedData.resources) {
        typeCount[resource.type] = (typeCount[resource.type] || 0) + 1;
      }
      
      for (const [type, count] of Object.entries(typeCount)) {
        logger.info('  - ' + type + ': ' + count);
      }
      logger.info('========================================');
      
      return this.parsedData;
    } catch (error) {
      logger.error('Error parsing Terraform directory:', error);
      throw new Error('Failed to parse Terraform files: ' + error.message);
    }
  }

  async parseDirectoryRecursive(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__MACOSX') {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.parseDirectoryRecursive(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tf') || entry.name.endsWith('.tfvars'))) {
          await this.parseFile(fullPath);
        }
      }
    } catch (error) {
      logger.error('Error reading directory ' + dirPath + ':', error);
    }
  }

  async parseFile(filePath) {
    try {
      logger.info('Parsing file: ' + filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      
      logger.info('File content length: ' + content.length + ' bytes');
      logger.info('First 200 chars: ' + content.substring(0, 200));
      
      let parsed;
      try {
        if (typeof hcl.parseToObject === 'function') {
          parsed = hcl.parseToObject(content);
        } else {
          logger.error('hcl2-parser does not have parseToObject. Keys: ' + Object.keys(hcl));
          throw new Error('hcl2-parser interface mismatch');
        }
      } catch (parseError) {
        logger.error('HCL Parse error for ' + filePath + ':', parseError);
        return;
      }
      
      logger.info('Raw parsed content for ' + path.basename(filePath) + ': ' + JSON.stringify(parsed, null, 2));

      if (!parsed) return;
      
      let parsedObj;
      if (Array.isArray(parsed)) {
        const validObjects = parsed.filter(item => item !== null && typeof item === 'object');
        if (validObjects.length === 0) {
          logger.warn('No valid parsed objects in ' + filePath);
          return;
        }
        
        parsedObj = validObjects.reduce((acc, obj) => {
          Object.keys(obj).forEach(key => {
            if (!acc[key]) {
              acc[key] = obj[key];
            } else {
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

      logger.info('Processing parsed object keys: ' + Object.keys(parsedObj).join(', '));

      if (parsedObj.resource) {
        logger.info('Found resources in ' + filePath);
        for (const [resourceType, resources] of Object.entries(parsedObj.resource)) {
          const resourceList = Array.isArray(resources) ? resources : [resources];
          
          for (const resourceObj of resourceList) {
            for (const [resourceName, config] of Object.entries(resourceObj)) {
              logger.info('Adding resource: ' + resourceType + '.' + resourceName);
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

      if (parsedObj.variable) {
        const varList = Array.isArray(parsedObj.variable) ? parsedObj.variable : [parsedObj.variable];
        for (const varObj of varList) {
          this.parsedData.variables = {
            ...this.parsedData.variables,
            ...varObj
          };
        }
      }

      if (parsedObj.locals) {
        const localsList = Array.isArray(parsedObj.locals) ? parsedObj.locals : [parsedObj.locals];
        for (const localsObj of localsList) {
          this.parsedData.locals = {
            ...this.parsedData.locals,
            ...localsObj
          };
        }
      }

      if (parsedObj.data) {
        for (const [dataType, dataSources] of Object.entries(parsedObj.data)) {
          const dataList = Array.isArray(dataSources) ? dataSources : [dataSources];
          
          for (const dataObj of dataList) {
            for (const [dataName, config] of Object.entries(dataObj)) {
              this.parsedData.dataSource[dataType + '.' + dataName] = config;
            }
          }
        }
      }

      if (parsedObj.module) {
        const moduleList = Array.isArray(parsedObj.module) ? parsedObj.module : [parsedObj.module];
        
        for (const moduleObj of moduleList) {
          for (const [moduleName, moduleConfig] of Object.entries(moduleObj)) {
            logger.info('Found module: ' + moduleName + ' with source: ' + moduleConfig.source);
            this.parsedData.modules.push({
              name: moduleName,
              source: moduleConfig.source,
              config: moduleConfig,
              file: filePath
            });
          }
        }
      }

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
      logger.error('Error parsing file ' + filePath + ':', error);
    }
  }

  async expandModuleResources() {
    logger.info('Expanding module resources...');
    logger.info('Found ' + this.parsedData.modules.length + ' module declarations');
    
    for (const module of this.parsedData.modules) {
      if (!module.source || module.source.startsWith('http')) {
        logger.info('Skipping remote module: ' + module.name);
        continue;
      }

      const count = module.config.count || 1;
      logger.info('Expanding module "' + module.name + '" with count=' + count + ', source=' + module.source);

      const baseDir = path.dirname(module.file);
      const moduleDir = path.resolve(baseDir, module.source);

      logger.info('Module directory resolved to: ' + moduleDir);

      try {
        await fs.access(moduleDir);
        
        const moduleResources = await this.parseModuleDirectory(moduleDir);
        
        logger.info('Found ' + moduleResources.length + ' resources in module ' + module.name);
        
        for (let i = 0; i < count; i++) {
          for (const resource of moduleResources) {
            const expandedResource = {
              ...resource,
              name: count > 1 ? resource.name + '[' + i + ']' : resource.name,
              module: count > 1 ? module.name + '[' + i + ']' : module.name,
              config: this.mergeModuleConfig(resource.config, module.config, i)
            };
            
            logger.info('Adding module resource: ' + expandedResource.type + '.' + expandedResource.name + ' (module: ' + expandedResource.module + ')');
            this.parsedData.resources.push(expandedResource);
          }
        }
      } catch (error) {
        logger.warn('Could not expand module "' + module.name + '" from ' + moduleDir + ': ' + error.message);
      }
    }
    
    logger.info('Module expansion complete. Total resources: ' + this.parsedData.resources.length);
  }

  async parseModuleDirectory(moduleDir) {
    const resources = [];
    
    try {
      const entries = await fs.readdir(moduleDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.tf')) {
          const filePath = path.join(moduleDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          
          try {
            const parsed = hcl.parseToObject(content);
            if (!parsed) continue;
            
            let parsedObj;
            if (Array.isArray(parsed)) {
              const validObjects = parsed.filter(item => item !== null && typeof item === 'object');
              parsedObj = validObjects.reduce((acc, obj) => {
                Object.keys(obj).forEach(key => {
                  if (!acc[key]) acc[key] = obj[key];
                  else if (typeof acc[key] === 'object' && typeof obj[key] === 'object') {
                    acc[key] = { ...acc[key], ...obj[key] };
                  }
                });
                return acc;
              }, {});
            } else {
              parsedObj = parsed;
            }
            
            if (parsedObj.resource) {
              for (const [resourceType, resourceObjs] of Object.entries(parsedObj.resource)) {
                const resourceList = Array.isArray(resourceObjs) ? resourceObjs : [resourceObjs];
                
                for (const resourceObj of resourceList) {
                  for (const [resourceName, config] of Object.entries(resourceObj)) {
                    logger.info('Found resource in module: ' + resourceType + '.' + resourceName);
                    resources.push({
                      type: resourceType,
                      name: resourceName,
                      config: config,
                      file: filePath
                    });
                  }
                }
              }
            }
          } catch (parseError) {
            logger.warn('Error parsing module file ' + filePath + ': ' + parseError.message);
          }
        }
      }
    } catch (error) {
      logger.error('Error reading module directory ' + moduleDir + ':', error);
    }
    
    return resources;
  }

  mergeModuleConfig(resourceConfig, moduleConfig, index) {
    const merged = { ...resourceConfig };
    
    for (const [key, value] of Object.entries(merged)) {
      if (typeof value === 'string' && value.includes('${var.')) {
        const varMatch = value.match(/\$\{var\.([^}]+)\}/);
        if (varMatch) {
          const varName = varMatch[1];
          if (moduleConfig[varName] !== undefined) {
            merged[key] = moduleConfig[varName];
          }
        }
      }
    }
    
    return merged;
  }

  resolveReferences() {
    for (const resource of this.parsedData.resources) {
      resource.config = this.resolveConfigReferences(resource.config);
    }
  }

  resolveLaunchTemplateReferences(resources) {
    const launchTemplates = new Map();
    
    for (const resource of resources) {
      if (resource.type === 'aws_launch_template') {
        launchTemplates.set(resource.name, resource.config);
        logger.info('Stored launch template: ' + resource.name + ' with instance_type: ' + resource.config.instance_type);
      }
    }
    
    for (const resource of resources) {
      if (resource.type === 'aws_autoscaling_group' && resource.config.launch_template) {
        const ltConfig = resource.config.launch_template;
        if (Array.isArray(ltConfig)) {
          const ltRef = ltConfig[0];
          const ltIdMatch = String(ltRef.id || '').match(/aws_launch_template\.([^.]+)/);
          if (ltIdMatch) {
            const ltName = ltIdMatch[1];
            const template = launchTemplates.get(ltName);
            if (template) {
              resource.config._resolved_launch_template = template;
              logger.info('Resolved launch template for ASG ' + resource.name + ': ' + ltName + ' (instance_type: ' + template.instance_type + ')');
            } else {
              logger.warn('Launch template ' + ltName + ' not found for ASG ' + resource.name);
            }
          }
        }
      }
    }
  }

  resolveConfigReferences(config, depth = 0) {
    if (depth > 10) return config;

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
    
    let cleanStr = str.replace(/^\$\{(.+)\}\$/, '$1');
    
    const varMatch = cleanStr.match(/^var\.([^.]+)/);
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

    const localMatch = cleanStr.match(/^local\.([^.]+)/);
    if (localMatch) {
      const localName = localMatch[1];
      if (this.parsedData.locals[localName] !== undefined) {
        return this.parsedData.locals[localName];
      }
    }

    return str;
  }

  getResourcesByType(type) {
    return this.parsedData.resources.filter(r => r.type === type);
  }

  getAllResources() {
    return this.parsedData.resources;
  }
}