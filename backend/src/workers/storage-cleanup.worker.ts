import { Worker } from 'bullmq';
import { redisConfig } from '../lib/redis';
import logger from '../lib/logger';
import { storageLifecycleService } from '../services/storage-lifecycle.service';

let storageCleanupWorker: Worker | null = null;

export function startStorageCleanupWorker() {
  if (storageCleanupWorker) {
    logger.warn('Storage Cleanup Worker is already running.');
    return;
  }

  storageCleanupWorker = new Worker(
    'storage-cleanup',
    async (job) => {
      if (job.name === 'purge-dataset-storage') {
        const { datasetId } = job.data as { datasetId: string };
        logger.info(`[StorageCleanupWorker] Starting purge for dataset ${datasetId} (Job ID: ${job.id})`);
        await storageLifecycleService.purgeDatasetStorage(datasetId, 'storage_cleanup_worker');

      } else if (job.name === 'scan-storage-cleanup') {
        logger.info(`[StorageCleanupWorker] Starting scheduled storage cleanup scan (Job ID: ${job.id})`);
        const summary = await storageLifecycleService.processDueDatasetPurges();
        logger.info(`[StorageCleanupWorker] Scan completed: ${JSON.stringify(summary)}`);

      } else {
        logger.warn(`[StorageCleanupWorker] Unknown job name: ${job.name}`);
      }
    },
    {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
      },
      // Concurrency 1: avoid concurrent purge state conflicts
      concurrency: 1,
    }
  );

  storageCleanupWorker.on('completed', (job) => {
    logger.info(`[StorageCleanupWorker] Job ${job.id} (${job.name}) completed successfully`);
  });

  storageCleanupWorker.on('failed', (job, err) => {
    logger.error(`[StorageCleanupWorker] Job ${job?.id} (${job?.name}) failed:`, err);
  });

  storageCleanupWorker.on('error', (err) => {
    logger.error('[StorageCleanupWorker] Worker error:', err);
  });

  logger.info('🚀 Storage Cleanup Worker started');
}
