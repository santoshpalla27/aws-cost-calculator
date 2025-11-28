import { TerraformParserService } from '../services/terraform.parser.service.js';
import { AWSClientFactory } from '../config/aws.config.js';
import { AWSPricingService } from '../services/aws.pricing.service.js';
import { AWSMetadataService } from '../services/aws.metadata.service.js';
import { CostCalculatorService } from '../services/cost.calculator.service.js';
import { DataMockerService } from '../services/data.mocker.service.js';
import logger from '../config/logger.config.js';
import fs from 'fs/promises';
import path from 'path';

export class EstimationController {
  async estimateCost(req, res) {
    const uploadPath = req.uploadPath;
    
    try {
      // Validate AWS credentials
      const credentials = this.extractCredentials(req);
      
      // Initialize services
      const clientFactory = new AWSClientFactory(credentials);
      const pricingService = new AWSPricingService(clientFactory);
      const metadataService = new AWSMetadataService(clientFactory);
      const mockerService = new DataMockerService();
      const calculatorService = new CostCalculatorService(
        pricingService,
        metadataService,
        mockerService
      );

      // Parse Terraform files
      logger.info('Parsing Terraform files...');
      const parser = new TerraformParserService();
      const parsedData = await parser.parseDirectory(uploadPath);

      logger.info(`Found ${parsedData.resources.length} resources`);

      // Get region from request or use default
      const region = req.body.region || 'us-east-1';

      // Calculate costs
      logger.info('Calculating costs...');
      const costBreakdown = await calculatorService.calculateTotalCost(
        parsedData.resources,
        region
      );

      // Format response
      const response = {
        success: true,
        data: {
          costEstimation: costBreakdown,
          summary: calculatorService.formatCostSummary(costBreakdown),
          metadata: {
            totalResources: parsedData.resources.length,
            resourceTypes: this.groupResourcesByType(parsedData.resources),
            modules: parsedData.modules.length,
            region
          }
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Error in cost estimation:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      // Cleanup uploaded files
      await this.cleanup(uploadPath);
    }
  }

  async validateTerraform(req, res) {
    const uploadPath = req.uploadPath;
    
    try {
      const parser = new TerraformParserService();
      const parsedData = await parser.parseDirectory(uploadPath);

      res.json({
        success: true,
        data: {
          valid: true,
          resources: parsedData.resources.length,
          modules: parsedData.modules.length,
          variables: Object.keys(parsedData.variables).length,
          resourceTypes: this.groupResourcesByType(parsedData.resources)
        }
      });

    } catch (error) {
      logger.error('Validation error:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid Terraform configuration',
        details: error.message
      });
    } finally {
      await this.cleanup(uploadPath);
    }
  }

  async getResourceMetadata(req, res) {
    try {
      const { resourceType, resourceId, region } = req.query;
      const credentials = this.extractCredentials(req);
      
      const clientFactory = new AWSClientFactory(credentials);
      const metadataService = new AWSMetadataService(clientFactory);

      let metadata;

      switch (resourceType) {
        case 'instance_type':
          metadata = await metadataService.getEC2InstanceTypeDetails(resourceId, region);
          break;
        
        case 'ami':
          metadata = await metadataService.getAMIDetails(resourceId, region);
          break;
        
        case 'availability_zones':
          metadata = await metadataService.getAvailabilityZones(region);
          break;
        
        default:
          return res.status(400).json({
            success: false,
            error: 'Unsupported resource type'
          });
      }

      res.json({
        success: true,
        data: metadata
      });

    } catch (error) {
      logger.error('Error fetching metadata:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  extractCredentials(req) {
    const accessKeyId = req.body.aws_access_key_id || req.headers['x-aws-access-key-id'] || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = req.body.aws_secret_access_key || req.headers['x-aws-secret-access-key'] || process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = req.body.aws_session_token || req.headers['x-aws-session-token'] || process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required');
    }

    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken })
    };
  }

  groupResourcesByType(resources) {
    return resources.reduce((acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + 1;
      return acc;
    }, {});
  }

  async cleanup(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      logger.info(`Cleaned up upload directory: ${dirPath}`);
    } catch (error) {
      logger.error(`Error cleaning up ${dirPath}:`, error);
    }
  }
}