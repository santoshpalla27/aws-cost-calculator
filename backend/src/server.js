/**
 * Server Entry Point
 */

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { healthCheck } = require('./config/database');

const startServer = async () => {
  try {
    // Check database connection
    const dbHealth = await healthCheck();
    if (!dbHealth.healthy) {
      throw new Error(`Database connection failed: ${dbHealth.error}`);
    }
    logger.info('Database connection established');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API docs available at http://localhost:${config.port}/api-docs`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        logger.info('Server closed. Exiting process.');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();