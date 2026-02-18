
import { Queue } from 'bullmq';
import { redisConfig } from './redis'; // Reuse the redisConfig
import logger from './logger';

// Create a new Queue instance
// Note: BullMQ requires a Redis connection or connection config
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
