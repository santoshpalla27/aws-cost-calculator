import { Injectable, Logger } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  LOG = 'log',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

@Injectable()
export class LoggingService {
  private logger = new Logger(LoggingService.name);

  log(level: LogLevel, message: string, context?: string, meta?: any) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || 'App',
      meta: meta || {},
    };

    switch (level) {
      case LogLevel.ERROR:
        this.logger.error(message, meta, context);
        break;
      case LogLevel.WARN:
        this.logger.warn(message, meta, context);
        break;
      case LogLevel.LOG:
        this.logger.log(message, meta, context);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(message, meta, context);
        break;
      case LogLevel.VERBOSE:
        this.logger.verbose(message, meta, context);
        break;
    }
  }

  error(message: string, meta?: any, context?: string) {
    this.log(LogLevel.ERROR, message, context, meta);
  }

  warn(message: string, meta?: any, context?: string) {
    this.log(LogLevel.WARN, message, context, meta);
  }

  info(message: string, meta?: any, context?: string) {
    this.log(LogLevel.LOG, message, context, meta);
  }

  debug(message: string, meta?: any, context?: string) {
    this.log(LogLevel.DEBUG, message, context, meta);
  }

  verbose(message: string, meta?: any, context?: string) {
    this.log(LogLevel.VERBOSE, message, context, meta);
  }
}