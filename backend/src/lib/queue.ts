
import { Queue } from 'bullmq';
import { getBullMqRedisConnection } from './redis';
import logger from './logger';

const redisConnection = getBullMqRedisConnection();

// Create a new Queue instance for asset processing
export const assetQueue = new Queue('asset-processing', {
  connection: redisConnection,
});

assetQueue.on('error', (err) => {
  logger.error('Asset Queue Error:', err);
});

export const addAssetJob = async (assetId: string, objectKey: string) => {
  await assetQueue.add('process-asset', { assetId, objectKey }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  });
};

// ---------- Normalize Queue ----------

export const normalizeQueue = new Queue('normalize-processing', {
  connection: redisConnection,
});

normalizeQueue.on('error', (err) => {
  logger.error('Normalize Queue Error:', err);
});

export const addNormalizeJob = async (contractId: string, submissionId: string) => {
  await normalizeQueue.add('normalize-contract', { contractId, submissionId }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  });
};

// ---------- Deadline Queue ----------

export const deadlineQueue = new Queue('deadline-processing', {
  connection: redisConnection,
});

deadlineQueue.on('error', (err) => {
  logger.error('Deadline Queue Error:', err);
});

export const addDeadlineScanJob = async () => {
  await deadlineQueue.add(
    'scan-deadlines',
    {},
    {
      jobId: 'deadline-scan',
      repeat: {
        every: Number(process.env.DEADLINE_SCAN_INTERVAL_MS || 60000),
      },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
};

// ---------- Storage Cleanup Queue ----------

export const storageCleanupQueue = new Queue('storage-cleanup', {
  connection: redisConnection,
});

storageCleanupQueue.on('error', (err) => {
  logger.error('Storage Cleanup Queue Error:', err);
});

/**
 * Enqueue a delayed dataset purge job.
 *
 * Safety rule: if a job with the same jobId already exists and the new
 * runAt is *earlier* than the existing delay, the old job is removed and
 * a new one is added. If that fails (race condition), we log a warning and
 * rely on the repeated scan fallback to pick it up.
 */
export const addStoragePurgeJob = async (datasetId: string, runAt: Date): Promise<void> => {
  const jobId = `storage-purge:${datasetId}`;
  const delay = Math.max(0, runAt.getTime() - Date.now());

  try {
    const existing = await storageCleanupQueue.getJob(jobId);

    if (existing) {
      // Calculate when the existing job is scheduled to run
      const existingRunAt = existing.timestamp + (existing.opts.delay ?? 0);
      if (runAt.getTime() < existingRunAt) {
        // New schedule is earlier — replace the existing job
        await existing.remove();
        logger.info(`[StorageCleanupQueue] Replaced delayed job ${jobId} with earlier runAt`);
      } else {
        // Existing job runs at the same time or earlier — keep it
        logger.info(`[StorageCleanupQueue] Existing job ${jobId} already scheduled earlier or same; skipping`);
        return;
      }
    }

    await storageCleanupQueue.add(
      'purge-dataset-storage',
      { datasetId },
      {
        jobId,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );

    logger.info(`[StorageCleanupQueue] Scheduled purge job for dataset ${datasetId} at ${runAt.toISOString()} (delay: ${delay}ms)`);
  } catch (err) {
    logger.warn(`[StorageCleanupQueue] Failed to schedule purge job for dataset ${datasetId}:`, err);
    // Non-fatal: the repeated scan job will pick it up when storagePurgeEligibleAt <= now
  }
};

/**
 * Register (or re-register) the repeated storage cleanup scan job.
 * Uses a fixed jobId so it is idempotent across restarts.
 */
export const addStorageCleanupScanJob = async (): Promise<void> => {
  await storageCleanupQueue.add(
    'scan-storage-cleanup',
    {},
    {
      jobId: 'storage-cleanup-scan',
      repeat: {
        every: Number(process.env.STORAGE_CLEANUP_SCAN_INTERVAL_MS || 3600000),
      },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
};
