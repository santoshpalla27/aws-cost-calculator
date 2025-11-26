import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import Joi from 'joi';

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { error, value } = registerSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            const result = await authService.register(value);

            logger.info('User registered successfully', { email: value.email });

            res.status(201).json(result);
        } catch (error: any) {
            logger.error('Registration error:', error);

            if (error.message === 'User already exists') {
                return res.status(409).json({ error: error.message });
            }

            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { error, value } = loginSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            const result = await authService.login(value.email, value.password);

            if (!result) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            logger.info('User logged in successfully', { email: value.email });

            res.json(result);
        } catch (error: any) {
            logger.error('Login error:', error);
            next(error);
        }
    }

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token is required' });
            }

            const result = await authService.refreshToken(refreshToken);

            if (!result) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            res.json(result);
        } catch (error) {
            logger.error('Refresh token error:', error);
            next(error);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                await authService.logout(refreshToken);
            }

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            logger.error('Logout error:', error);
            next(error);
        }
    }

    async validate(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ valid: false });
            }

            const token = authHeader.substring(7);
            const isValid = await authService.validateToken(token);

            res.json({ valid: isValid });
        } catch (error) {
            logger.error('Token validation error:', error);
            res.json({ valid: false });
        }
    }

    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const user = await authService.getUserById(userId);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            });
        } catch (error) {
            logger.error('Get current user error:', error);
            next(error);
        }
    }
}

export const authController = new AuthController();