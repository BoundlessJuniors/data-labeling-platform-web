import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Load environment variables first
dotenv.config();

// BigInt cannot be serialised to JSON by default.
// Prisma returns BigInt for columns like sizeBytes – this polyfill converts
// them to Number so JSON.stringify works without errors.
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// Fail fast in production if critical security config is missing or insecure.
// Must run after dotenv.config() and before any other imports that read env vars.
import { validateSecurityConfig } from './config/security';
validateSecurityConfig();

import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';
import { defaultRateLimiter } from './middlewares/rate-limit.middleware';
import { setupSecurity } from './middlewares/security.middleware';
import { csrfProtection, rejectNonJsonUnsafeRequests } from './middlewares/csrf.middleware';
import logger from './lib/logger';
import redis from './lib/redis';
import { ensureBucket } from './lib/storage';
import { startAssetWorker } from './workers/asset.worker';
import { startNormalizeWorker } from './workers/normalize.worker';
import { startDeadlineWorker } from './workers/deadline.worker';
import { startStorageCleanupWorker } from './workers/storage-cleanup.worker';
import { addDeadlineScanJob, addStorageCleanupScanJob } from './lib/queue';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy for rate limiting (Nginx/Cloudflare etc)
app.set('trust proxy', 1);

// Security middleware (Helmet, CORS)
setupSecurity(app);

// JSON-only guard for /api/v1 unsafe requests.
// Runs BEFORE body parsers so Content-Type is inspected before any body is consumed.
app.use('/api/v1', rejectNonJsonUnsafeRequests);

// Body parsers
// express.urlencoded is intentionally omitted — no existing route needs it.
app.use(express.json({ limit: '2mb' }));

// Cookie parser (populates req.cookies — required by auth and CSRF middleware)
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Rate limiting (global)
app.use(defaultRateLimiter);

// CSRF protection for /api/v1 (after rate limiter, before routes)
// The /health endpoint is outside /api/v1 so it is not subject to CSRF checks.
app.use('/api/v1', csrfProtection);

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
app.use('/api/v1', routes);

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

    // Start background workers
    startAssetWorker();
    startNormalizeWorker();
    startDeadlineWorker();
    startStorageCleanupWorker();
    await addDeadlineScanJob().catch((err) =>
      logger.warn('Failed to add deadline scan job:', err),
    );
    await addStorageCleanupScanJob().catch((err) =>
      logger.warn('Failed to add storage cleanup scan job:', err),
    );

    // Ensure the storage bucket exists (creates it on MinIO if missing)
    await ensureBucket();

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📚 API documentation available at http://localhost:${PORT}/api/v1`);
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
