import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { config } from '../config';
import { logger } from './logger';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<span><span style="color: rgb(150, 34, 73); font-weight: bold;" >& lt; void& gt; </span><span style="color: black; font-weight: normal;"> =&gt; {
try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;

        // Validate token with auth service
        const response = await axios.post(
            `\${config.services.auth}/validate`,
            {},
            { headers: { Authorization: `Bearer \${token}` } }
        );

        if (response.data.valid) {
            req.user = {
                id: decoded.userId,
                email: decoded.email,
                role: decoded.role
            };
            next();
        } else {
            res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        logger.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
} catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
}
};

export const authorize = (...roles: string[]) =& gt; {
    return (req: AuthRequest, res: Response, next: NextFunction): void =& gt; {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }

        next();
    };
};