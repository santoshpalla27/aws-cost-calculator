import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) =& gt; {
    logger.error('Unhandled error:', err);

    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
};