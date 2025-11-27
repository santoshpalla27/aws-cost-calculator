import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json({ error: result.error });
      }
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role } = req.body;
      const result = await AuthService.register(email, password, role);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      logger.error('Register error:', error);
      next(error);
    }
  }

  async validate(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.json({ valid: false });
      }

      const token = authHeader.replace('Bearer ', '');
      const result = await AuthService.validateToken(token);

      res.json(result);
    } catch (error) {
      res.json({ valid: false });
    }
  }
}

export const authController = new AuthController();