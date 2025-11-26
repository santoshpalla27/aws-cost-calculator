import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import ec2Routes from './routes/ec2Routes';
import rdsRoutes from './routes/rdsRoutes';
import s3Routes from './routes/s3Routes';
import eksRoutes from './routes/eksRoutes';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) =& gt; {
    res.json({
        status: 'healthy',
        service: 'aws-pricing-service',
        version: '1.0.0'
    });
});

// Routes
app.use('/api/ec2', ec2Routes);
app.use('/api/rds', rdsRoutes);
app.use('/api/s3', s3Routes);
app.use('/api/eks', eksRoutes);

// Error handling
app.use(errorHandler);

const PORT = config.port || 3003;

app.listen(PORT, () =& gt; {
    logger.info(`AWS Pricing Service running on port \${PORT}`);
});

export default app;