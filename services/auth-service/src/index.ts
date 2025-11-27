import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './config/database';
import { logger } from './utils/logger';
import { authRoutes } from './routes/authRoutes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: '1.0.0'
  });
});

// Validate token endpoint
app.post('/validate', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.substring(7);
    const decoded = require('jsonwebtoken').verify(token, config.jwtSecret);

    // In a real application, you'd check if the user exists in the database
    res.json({ valid: true, user: { id: decoded.userId, email: decoded.email } });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});

export default app;