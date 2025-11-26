import 'reflect-metadata';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { AppDataSource } from './config/database';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import reportRoutes from './routes/reportRoutes';

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) =& gt; {
    res.json({
        status: 'healthy',
        service: 'reports-service',
        version: '1.0.0'
    });
});

app.use('/api/reports', reportRoutes);
app.use(errorHandler);

const PORT = config.port || 3004;

AppDataSource.initialize()
    .then(() =& gt; {
    logger.info('Database connected successfully');

    app.listen(PORT, () =& gt; {
        logger.info(`Reports Service running on port \${PORT}`);
    });
})
  .catch ((error) =& gt; {
    logger.error('Error during Data Source initialization:', error);
    process.exit(1);
});

export default app;