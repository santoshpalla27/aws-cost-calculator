import { TerraformParserService } from '../services/terraform.parser.service.js';
import { AWSClientFactory } from '../config/aws.config.js';
import { CostCalculatorService } from '../services/cost.calculator.service.js';
import logger from '../config/logger.config.js';
import fs from 'fs/promises';

export class EstimationController {
  async estimateCost(req, res) {
    const uploadPath = req.uploadPath;
    
    try {
      // Extract and validate AWS credentials
      const credentials = this.extractCredentials(req);
      
      // Create AWS client factory with credentials
      const clientFactory = new AWSClientFactory(credentials);
      
      // Initialize cost calculator with the client factory
      const calculatorService = new CostCalculatorService(clientFactory);

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
            region,
            supportedResources: costBreakdown.resources.length,
            unsupportedResources: costBreakdown.unsupportedResources.length
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

      // This would need metadata service implementation
      res.json({
        success: true,
        data: {
          message: 'Metadata endpoint - implement as needed'
        }
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
    const accessKeyId = req.body.aws_access_key_id || 
                       req.headers['x-aws-access-key-id'] || 
                       process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = req.body.aws_secret_access_key || 
                           req.headers['x-aws-secret-access-key'] || 
                           process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = req.body.aws_session_token || 
                        req.headers['x-aws-session-token'] || 
                        process.env.AWS_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required. Provide aws_access_key_id and aws_secret_access_key.');
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
      if (dirPath) {
        await fs.rm(dirPath, { recursive: true, force: true });
        logger.info(`Cleaned up upload directory: ${dirPath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up ${dirPath}:`, error);
    }
  }
}