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
    this.moduleSourcePaths = new Set();
  }

  async parseDirectory(dirPath) {
    try {
      logger.info('Parsing directory: ' + dirPath);
      
      // First pass: find all modules
      this.moduleSourcePaths = new Set();
      await this.findModules(dirPath);
      
      // Second pass: parse all files to collect variables first
      await this.parseAllFilesForVariables(dirPath);
      
      // Third pass: parse root files for resources (now with variables available)
      await this.parseRootFiles(dirPath);
      
      logger.info('Parsed data summary: ' + this.parsedData.resources.length + ' resources found.');
      
      // Resolve all references now that we have all variables
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

  async findModules(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      if (entry.isDirectory()) {
        await this.findModules(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.tf')) {
        const content = await fs.readFile(fullPath, 'utf-8');
        try {
          const parsed = hcl.parseToObject(content);
          if (!parsed) continue;
          
          let parsedObj = Array.isArray(parsed) 
            ? parsed.filter(item => item !== null).reduce((acc, obj) => ({...acc, ...obj}), {})
            : parsed;
          
          if (parsedObj.module) {
            const moduleList = Array.isArray(parsedObj.module) ? parsedObj.module : [parsedObj.module];
            for (const moduleObj of moduleList) {
              for (const [moduleName, moduleConfig] of Object.entries(moduleObj)) {
                const config = Array.isArray(moduleConfig) ? moduleConfig[0] : moduleConfig;
                if (config.source && !config.source.startsWith('http')) {
                  const moduleDir = path.resolve(path.dirname(fullPath), config.source);
                  this.moduleSourcePaths.add(moduleDir);
                  logger.info('Found module source path: ' + moduleDir);
                }
              }
            }
          }
        } catch (e) {
          // Ignore parse errors in first pass
        }
      }
    }
  }

  async parseAllFilesForVariables(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      if (entry.isDirectory()) {
        await this.parseAllFilesForVariables(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.tf')) {
        await this.parseFileForVariables(fullPath);
      }
    }
  }

  async parseFileForVariables(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = hcl.parseToObject(content);
      if (!parsed) return;
      
      let parsedObj = Array.isArray(parsed) 
        ? parsed.filter(item => item !== null).reduce((acc, obj) => ({...acc, ...obj}), {})
        : parsed;
      
      // Only extract variables
      if (parsedObj.variable) {
        const varList = Array.isArray(parsedObj.variable) ? parsedObj.variable : [parsedObj.variable];
        for (const varObj of varList) {
          this.parsedData.variables = { ...this.parsedData.variables, ...varObj };
        }
        logger.info(`Loaded variables from ${filePath}: ${Object.keys(parsedObj.variable).join(', ')}`);
      }
    } catch (error) {
      logger.warn(`Error parsing variables from ${filePath}: ${error.message}`);
    }
  }

  async parseRootFiles(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__MACOSX') {
        continue;
      }
      
      if (entry.isDirectory()) {
        if (this.moduleSourcePaths.has(fullPath)) {
          logger.info('Skipping module directory: ' + fullPath);
          continue;
        }
        await this.parseRootFiles(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tf') || entry.name.endsWith('.tfvars'))) {
        await this.parseFile(fullPath);
      }
    }
  }

  async parseFile(filePath) {
    try {
      logger.info('Parsing file: ' + filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      
      let parsed;
      try {
        parsed = hcl.parseToObject(content);
      } catch (parseError) {
        logger.error('HCL Parse error for ' + filePath + ':', parseError);
        return;
      }

      if (!parsed) return;
      
      let parsedObj = Array.isArray(parsed)
        ? parsed.filter(item => item !== null).reduce((acc, obj) => ({...acc, ...obj}), {})
        : parsed;

      if (parsedObj.resource) {
        for (const [resourceType, resources] of Object.entries(parsedObj.resource)) {
          const resourceList = Array.isArray(resources) ? resources : [resources];
          
          for (const resourceObj of resourceList) {
            for (const [resourceName, config] of Object.entries(resourceObj)) {
              logger.info('Adding resource: ' + resourceType + '.' + resourceName);
              this.parsedData.resources.push({
                type: resourceType,
                name: resourceName,
                config: Array.isArray(config) ? config[0] : config,
                file: filePath
              });
            }
          }
        }
      }

      if (parsedObj.locals) {
        const localsList = Array.isArray(parsedObj.locals) ? parsedObj.locals : [parsedObj.locals];
        for (const localsObj of localsList) {
          this.parsedData.locals = { ...this.parsedData.locals, ...localsObj };
        }
      }

      if (parsedObj.module) {
        const moduleList = Array.isArray(parsedObj.module) ? parsedObj.module : [parsedObj.module];
        
        for (const moduleObj of moduleList) {
          for (const [moduleName, moduleConfig] of Object.entries(moduleObj)) {
            const actualConfig = Array.isArray(moduleConfig) ? moduleConfig[0] : moduleConfig;
            this.parsedData.modules.push({
              name: moduleName,
              source: actualConfig.source,
              config: actualConfig,
              file: filePath
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error parsing file ' + filePath + ':', error);
    }
  }

  async expandModuleResources() {
    for (const module of this.parsedData.modules) {
      if (module.source && module.source.includes('terraform-aws-modules/')) {
        const registryResources = this.estimateRegistryModuleResources(module);
        for (const resource of registryResources) {
          this.parsedData.resources.push(resource);
        }
        continue;
      }

      if (!module.source || module.source.startsWith('http')) continue;

      const count = module.config.count || 1;
      const baseDir = path.dirname(module.file);
      const moduleDir = path.resolve(baseDir, module.source);

      try {
        await fs.access(moduleDir);
        const moduleResources = await this.parseModuleDirectory(moduleDir);
        
        for (let i = 0; i < count; i++) {
          for (const resource of moduleResources) {
            this.parsedData.resources.push({
              ...resource,
              name: count > 1 ? resource.name + '[' + i + ']' : resource.name,
              module: count > 1 ? module.name + '[' + i + ']' : module.name,
              config: this.mergeModuleConfig(resource.config, module.config, i)
            });
          }
        }
      } catch (error) {
        logger.warn('Could not expand module ' + module.name + ': ' + error.message);
      }
    }
  }

  estimateRegistryModuleResources(module) {
    const resources = [];
    const config = module.config;
    
    if (module.source.includes('vpc/aws')) {
      if (config.enable_nat_gateway) {
        const natCount = config.single_nat_gateway ? 1 : 
                         (config.one_nat_gateway_per_az ? 3 : 1);
        
        for (let i = 0; i < natCount; i++) {
          resources.push({
            type: 'aws_nat_gateway',
            name: `this[${i}]`,
            module: `module.${module.name}`,
            config: {},
            file: module.file
          });
        }
        logger.info(`Added ${natCount} NAT Gateway(s) from VPC module`);
      }
      
      if (config.enable_nat_gateway) {
        resources.push({
          type: 'aws_eip',
          name: 'nat',
          module: `module.${module.name}`,
          config: { domain: 'vpc' },
          file: module.file
        });
      }
    }
    
    return resources;
  }

  async parseModuleDirectory(moduleDir) {
    const resources = [];
    try {
      const entries = await fs.readdir(moduleDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.tf')) {
          const filePath = path.join(moduleDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = hcl.parseToObject(content);
          
          if (parsed) {
            let parsedObj = Array.isArray(parsed) ? parsed.filter(i => i).reduce((a, o) => ({...a, ...o}), {}) : parsed;
            
            if (parsedObj.resource) {
              for (const [type, objs] of Object.entries(parsedObj.resource)) {
                const list = Array.isArray(objs) ? objs : [objs];
                for (const obj of list) {
                  for (const [name, config] of Object.entries(obj)) {
                    resources.push({
                      type,
                      name,
                      config: Array.isArray(config) ? config[0] : config,
                      file: filePath
                    });
                  }
                }
              }
            }
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
    const varMappings = {
      'instance_type': 'instance_type',
      'ami': 'ami',
      'node_type': 'node_type',
      'instance_class': 'instance_class'
    };
    
    for (const [moduleVar, resourceAttr] of Object.entries(varMappings)) {
      if (moduleConfig[moduleVar] !== undefined) {
        if (typeof merged[resourceAttr] === 'string' && merged[resourceAttr].includes('${var.')) {
          merged[resourceAttr] = moduleConfig[moduleVar];
        } else if (merged[resourceAttr] === undefined) {
          merged[resourceAttr] = moduleConfig[moduleVar];
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
        let instanceType = resource.config.instance_type;
        if (typeof instanceType === 'string' && instanceType.includes('var.')) {
          instanceType = this.resolveStringReference(instanceType);
        }
        
        const resolvedConfig = {
          ...resource.config,
          instance_type: instanceType
        };
        
        launchTemplates.set(resource.name, resolvedConfig);
        logger.info(`Stored launch template: ${resource.name} with instance_type: ${instanceType}`);
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
    
    let cleanStr = str;
    const varRefMatch = str.match(/^\$\{(.+)\}\$/);
    if (varRefMatch) {
      cleanStr = varRefMatch[1];
    }
    
    const varMatch = cleanStr.match(/^var\.([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (varMatch) {
      const varName = varMatch[1];
      const varData = this.parsedData.variables[varName];
      
      if (varData) {
        const actualVar = Array.isArray(varData) ? varData[0] : varData;
        if (actualVar && actualVar.default !== undefined) {
          logger.info(`Resolved var.${varName} = ${actualVar.default}`);
          return actualVar.default;
        }
      }
      logger.warn(`Could not resolve var.${varName}, keeping original`);
    }

    const localMatch = cleanStr.match(/^local\.([a-zA-Z_][a-zA-Z0-9_]*)/);
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