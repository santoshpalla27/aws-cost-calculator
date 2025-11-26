import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: config.corsOrigins,
    credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message =& gt; logger.info(message.trim()) } }));

// Rate limiting
app.use(rateLimiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) =& gt; {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'api-gateway',
        version: '1.0.0'
    });
});

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

const PORT = config.port || 3000;

app.listen(PORT, () =& gt; {
    logger.info(`API Gateway running on port \${PORT}`);
    logger.info(`API Documentation available at http://localhost:\${PORT}/api-docs`);
});

export default app;