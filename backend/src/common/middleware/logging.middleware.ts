import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startTime = Date.now();
    
    response.on('close', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl, ip } = request;
      const { statusCode, statusMessage } = response;
      
      const message = `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`;
      
      // Log differently based on status code
      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}