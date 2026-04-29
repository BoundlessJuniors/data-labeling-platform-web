
import { Queue } from 'bullmq';
import { redisConfig } from './redis'; // Reuse the redisConfig
import logger from './logger';

// Create a new Queue instance for asset processing
export const assetQueue = new Queue('asset-processing', {
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db
  },
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
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db
  },
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
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db
  },
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
