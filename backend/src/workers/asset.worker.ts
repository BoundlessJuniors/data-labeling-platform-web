
import { Worker, Job } from 'bullmq';
import sharp from 'sharp';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../lib/storage';
import prisma from '../lib/db';
import { redisConfig } from '../lib/redis';
import logger from '../lib/logger';
import { Readable } from 'stream';

const WORKER_NAME = 'asset-processing';

// Helper to convert stream to buffer
const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

export function startAssetWorker() {
  const worker = new Worker(
    WORKER_NAME,
    async (job: Job) => {
      const { assetId, objectKey } = job.data;
      logger.info(`[AssetWorker] Processing job ${job.id} for asset ${assetId}`);

      try {
        // Reload asset to check current storageState.
        // If the dataset has been purged since this job was enqueued, skip processing.
        const freshAsset = await prisma.asset.findUnique({
          where: { id: assetId },
          select: { id: true, storageState: true },
        });
        if (!freshAsset) {
          logger.warn(`[AssetWorker] Asset ${assetId} not found; skipping job ${job.id}`);
          return;
        }
        if (freshAsset.storageState === 'purged') {
          logger.info(`[AssetWorker] Asset ${assetId} is purged; skipping processing job ${job.id}`);
          return;
        }

        // 1. Update status to processing
        await prisma.asset.update({
          where: { id: assetId },
          data: { status: 'processing' },
        });

        // 2. Fetch object from R2
        const getCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: objectKey,
        });
        
        const response = await s3Client.send(getCommand);
        
        if (!response.Body) {
            throw new Error('Empty response body from S3');
        }

        // 3. Download to buffer for Sharp
        // Note: For very large files, streaming might be better, but Sharp needs random access for some operations. 
        // For typical images (dataset assets), buffer is usually fine.
        const buffer = await streamToBuffer(response.Body as Readable);

        // 4. Extract metadata
        const metadata = await sharp(buffer).metadata();
        const width = metadata.width;
        const height = metadata.height;
        const sizeBytes = metadata.size || buffer.length;

        // 5. Update asset in DB
        await prisma.asset.update({
          where: { id: assetId },
          data: {
            status: 'ready',
            width: width,
            height: height,
            sizeBytes: sizeBytes,
            processingError: null,
          },
        });

        logger.info(`[AssetWorker] Validated asset ${assetId}: ${width}x${height}`);

      } catch (error: any) {
        logger.error(`[AssetWorker] Job failed for asset ${assetId}:`, error);
        
        await prisma.asset.update({
          where: { id: assetId },
          data: {
            status: 'error',
            processingError: error.message || 'Unknown processing error',
          },
        });
        
        throw error; // Let BullMQ handle retry mechanism
      }
    },
    {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db
      },
      concurrency: 5, // Process 5 images concurrently
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[AssetWorker] Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[AssetWorker] Job ${job?.id} failed with ${err.message}`);
  });

  logger.info(`🚀 Worker "${WORKER_NAME}" started`);
  return worker;
}
