import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../middleware/logger';

export class AWSController {
  async calculateEC2(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await axios.post(
        `${config.services.awsPricing}/ec2`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      logger.error('AWS EC2 calculation error:', error);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        next(error);
      }
    }
  }

  async calculateRDS(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await axios.post(
        `${config.services.awsPricing}/rds`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      logger.error('AWS RDS calculation error:', error);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        next(error);
      }
    }
  }

  async calculateS3(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await axios.post(
        `${config.services.awsPricing}/s3`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      logger.error('AWS S3 calculation error:', error);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        next(error);
      }
    }
  }

  async calculateEKS(req: Request, res: Response, next: NextFunction) {
    try {
      const response = await axios.post(
        `${config.services.awsPricing}/eks`,
        req.body,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      logger.error('AWS EKS calculation error:', error);
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        next(error);
      }
    }
  }
}

export const awsController = new AWSController();