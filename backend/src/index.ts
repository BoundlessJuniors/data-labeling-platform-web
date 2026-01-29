import express from 'express';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';
import { defaultRateLimiter } from './middlewares/rate-limit.middleware';
import { setupSecurity } from './middlewares/security.middleware';
import logger from './lib/logger';
import redis from './lib/redis';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (Helmet, CORS)
setupSecurity(app);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(defaultRateLimiter);

// Health check endpoint
app.get('/health', async (_req, res) => {
  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'data-labeling-backend',
    redis: redisStatus,
  });
});

// API routes
app.use('/api', routes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Connect to Redis and start server
const startServer = async () => {
  try {
    // Try to connect to Redis (optional - app works without it)
    await redis.connect().catch((error) => {
      logger.warn('Redis connection failed, caching disabled:', error.message);
    });

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📚 API documentation available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});

export default app;
