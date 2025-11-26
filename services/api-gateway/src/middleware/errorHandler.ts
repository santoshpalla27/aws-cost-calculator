import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void =& gt; {
    if (err instanceof AppError) {
        logger.error(`Operational Error: \${err.message}`, {
            statusCode: err.statusCode,
            path: req.path,
            method: req.method
        });

        res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
        return;
    }

    // Programming or unknown errors
    logger.error('Unexpected Error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
    });
};