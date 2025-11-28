import { parse } from 'hcl2-parser';
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
      const structure = await this.buildDirectoryStructure(dirPath);
      await this.parseFiles(structure);
      await this.resolveModules(dirPath);
      this.resolveReferences();
      
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
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = parse(filePath, content);

      // Extract resources
      if (parsed.resource) {
        for (const [resourceType, resources] of Object.entries(parsed.resource)) {
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
      if (parsed.variable) {
        this.parsedData.variables = {
          ...this.parsedData.variables,
          ...parsed.variable
        };
      }

      // Extract locals
      if (parsed.locals) {
        this.parsedData.locals = {
          ...this.parsedData.locals,
          ...parsed.locals
        };
      }

      // Extract data sources
      if (parsed.data) {
        for (const [dataType, dataSources] of Object.entries(parsed.data)) {
          for (const [dataName, config] of Object.entries(dataSources)) {
            this.parsedData.dataSource[`${dataType}.${dataName}`] = config;
          }
        }
      }

      // Extract modules
      if (parsed.module) {
        for (const [moduleName, moduleConfig] of Object.entries(parsed.module)) {
          this.parsedData.modules.push({
            name: moduleName,
            source: moduleConfig.source,
            config: moduleConfig,
            file: filePath
          });
        }
      }

      // Extract outputs
      if (parsed.output) {
        this.parsedData.outputs = {
          ...this.parsedData.outputs,
          ...parsed.output
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