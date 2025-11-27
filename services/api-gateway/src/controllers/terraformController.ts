import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../middleware/logger';

export class TerraformController {
  async estimate(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await axios.post(
        `${config.services.terraformCost}/estimate`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization,
          },
          timeout: 300000, // 5 minutes
        }
      );

      res.json(response.data);
    } catch (error: any) {
      logger.error('Terraform estimate error:', error);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        next(error);
      }
    }
  }

  async diff(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await axios.post(
        `${config.services.terraformCost}/diff`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization,
          },
          timeout: 300000,
        }
      );

      res.json(response.data);
    } catch (error: any) {
      logger.error('Terraform diff error:', error);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        next(error);
      }
    }
  }
}

export const terraformController = new TerraformController();