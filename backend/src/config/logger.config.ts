import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
};

// For development
export const consoleLoggerConfig = {
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    utilities.format.nestLike('App', { prettyPrint: true }),
  ),
  transports: [
    new winston.transports.Console(),
  ],
};