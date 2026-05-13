import { Worker } from 'bullmq';
import { redisConfig } from '../lib/redis';
import logger from '../lib/logger';
import { deadlineService } from '../services/deadline.service';

let deadlineWorker: Worker | null = null;
const logDeadlineScans = process.env.LOG_DEADLINE_SCANS === 'true';

export function startDeadlineWorker() {
  if (deadlineWorker) {
    logger.warn('Deadline Worker is already running.');
    return;
  }

  deadlineWorker = new Worker(
    'deadline-processing',
    async (job) => {
      if (job.name === 'scan-deadlines') {
        if (logDeadlineScans) {
          logger.info(`[DeadlineWorker] Starting scheduled deadline scan (Job ID: ${job.id})`);
        }
        await deadlineService.processDeadlines();
      } else {
        logger.warn(`[DeadlineWorker] Unknown job name: ${job.name}`);
      }
    },
    {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
      },
      concurrency: 1,
    }
  );

  deadlineWorker.on('completed', (job) => {
    if (logDeadlineScans) {
      logger.info(`[DeadlineWorker] Job ${job.id} completed successfully`);
    }
  });

  deadlineWorker.on('failed', (job, err) => {
    logger.error(`[DeadlineWorker] Job ${job?.id} failed:`, err);
  });

  deadlineWorker.on('error', (err) => {
    logger.error('[DeadlineWorker] Worker error:', err);
  });

  logger.info('🚀 Deadline Worker started');
}
