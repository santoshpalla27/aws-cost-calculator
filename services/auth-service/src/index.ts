import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { AppDataSource } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) =& gt; {
    res.json({
        status: 'healthy',
        service: 'auth-service',
        version: '1.0.0'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

// Initialize database and start server
const PORT = config.port || 3002;

AppDataSource.initialize()
    .then(() =& gt; {
    logger.info('Database connected successfully');

    app.listen(PORT, () =& gt; {
        logger.info(`Auth Service running on port \${PORT}`);
    });
})
  .catch ((error) =& gt; {
    logger.error('Error during Data Source initialization:', error);
    process.exit(1);
});

export default app;