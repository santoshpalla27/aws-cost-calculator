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
      const structure = await this.buildDirectoryStructure(dirPath);
      logger.info(`Directory structure: ${JSON.stringify(structure, null, 2)}`);
      
      await this.parseFiles(structure);
      await this.resolveModules(dirPath);
      this.resolveReferences();
      
      logger.info(`Parsed data summary: ${this.parsedData.resources.length} resources found.`);
      return this.parsedData;
    } catch (error) {
      logger.error('Error parsing Terraform directory:', error);
      throw new Error(`Failed to parse Terraform files: ${error.message}`);
    }
  }

  async buildDirectoryStructure(dirPath) {
    const structure = {
      root: dirPath,
      files: [],
      modules: []
    };

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'modules' || entry.name === '.terraform') {
          const subStructure = await this.buildDirectoryStructure(fullPath);
          structure.modules.push({
            name: entry.name,
            path: fullPath,
            structure: subStructure
          });
        }
      } else if (entry.isFile() && entry.name.endsWith('.tf')) {
        structure.files.push({
          name: entry.name,
          path: fullPath
        });
      }
    }

    return structure;
  }

  async parseFiles(structure) {
    // Parse root files
    for (const file of structure.files) {
      await this.parseFile(file.path);
    }

    // Parse module files
    for (const module of structure.modules) {
      await this.parseFiles(module.structure);
    }
  }

  async parseFile(filePath) {
    try {
      logger.info(`Parsing file: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Attempt to parse
      let parsed;
      try {
        // Use parseToObject which is the standard method for hcl2-parser
        // It might return an array if there are multiple blocks, or an object.
        // Note: hcl2-parser typically returns an array of objects for each block type if using parseToObject?
        // Let's check if hcl has parseToObject
        if (typeof hcl.parseToObject === 'function') {
           parsed = hcl.parseToObject(content);
        } else {
           // Fallback or debug
           logger.error(`hcl2-parser does not have parseToObject. Keys: ${Object.keys(hcl)}`);
           throw new Error('hcl2-parser interface mismatch');
        }
      } catch (parseError) {
        logger.error(`HCL Parse error for ${filePath}:`, parseError);
        return; // Skip file if parsing fails
      }
      
      // Log the raw parsed output for debugging
      logger.info(`Raw parsed content for ${path.basename(filePath)}: ${JSON.stringify(parsed, null, 2)}`);

      if (!parsed) return;
      
      // hcl2-parser returns an array of objects. We need to merge them if so, or handle them.
      // Actually, parseToObject typically returns a single object with keys like "resource", "variable", etc.
      // EXCEPT if the input has duplicates, it might behavior differently. 
      // But typically it returns { resource: { ... }, variable: { ... } }
      
      // If parsed is an array (sometimes it returns [ { resource: ... } ]), we should normalize.
      const parsedObj = Array.isArray(parsed) ? parsed[0] : parsed;

      if (!parsedObj) return;

      // Extract resources
      if (parsedObj.resource) {
        for (const [resourceType, resources] of Object.entries(parsedObj.resource)) {
          for (const [resourceName, config] of Object.entries(resources)) {
            this.parsedData.resources.push({
              type: resourceType,
              name: resourceName,
              config: config,
              file: filePath
            });
          }
        }
      }

      // Extract variables
      if (parsedObj.variable) {
        this.parsedData.variables = {
          ...this.parsedData.variables,
          ...parsedObj.variable
        };
      }

      // Extract locals
      if (parsedObj.locals) {
        this.parsedData.locals = {
          ...this.parsedData.locals,
          ...parsedObj.locals
        };
      }

      // Extract data sources
      if (parsedObj.data) {
        for (const [dataType, dataSources] of Object.entries(parsedObj.data)) {
          for (const [dataName, config] of Object.entries(dataSources)) {
            this.parsedData.dataSource[`${dataType}.${dataName}`] = config;
          }
        }
      }

      // Extract modules
      if (parsedObj.module) {
        for (const [moduleName, moduleConfig] of Object.entries(parsedObj.module)) {
          this.parsedData.modules.push({
            name: moduleName,
            source: moduleConfig.source,
            config: moduleConfig,
            file: filePath
          });
        }
      }

      // Extract outputs
      if (parsedObj.output) {
        this.parsedData.outputs = {
          ...this.parsedData.outputs,
          ...parsedObj.output
        };
      }

    } catch (error) {
      logger.error(`Error parsing file ${filePath}:`, error);
      throw error;
    }
  }

  async resolveModules(rootPath) {
    for (const module of this.parsedData.modules) {
      if (module.source.startsWith('./') || module.source.startsWith('../')) {
        const modulePath = path.resolve(rootPath, module.source);
        try {
          const moduleStructure = await this.buildDirectoryStructure(modulePath);
          const moduleParser = new TerraformParserService();
          await moduleParser.parseFiles(moduleStructure);
          
          // Add module resources to main resources with module prefix
          for (const resource of moduleParser.parsedData.resources) {
            this.parsedData.resources.push({
              ...resource,
              module: module.name,
              moduleSource: module.source
            });
          }
        } catch (error) {
          logger.warn(`Could not resolve module ${module.name}:`, error.message);
        }
      }
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
    // Handle Terraform interpolation syntax
    const varMatch = str.match(/\$\{var\.([^}]+)\}/);
    if (varMatch) {
      const varName = varMatch[1];
      if (this.parsedData.variables[varName]?.default !== undefined) {
        return this.parsedData.variables[varName].default;
      }
    }

    const localMatch = str.match(/\$\{local\.([^}]+)\}/);
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