import { StorageState } from '@prisma/client';

import { Worker, Job } from 'bullmq';
import sharp from 'sharp';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, deleteFromR2Safe } from '../lib/storage';
import prisma from '../lib/db';
import { redisConfig } from '../lib/redis';
import logger from '../lib/logger';
import { Readable } from 'stream';
import { getBetaLimits } from '../config/beta-limits';

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

// Helper for oversized/quota rejections
async function rejectUploadedObject(params: {
  assetId: string;
  objectKey: string;
  actualSizeBytes: number;
  processingError: string;
}): Promise<void> {
  const { assetId, objectKey, actualSizeBytes, processingError } = params;
  const now = new Date();
  let objectDeleted = false;
  let objectDeleteError: string | null = null;

  try {
    await deleteFromR2Safe(objectKey);
    objectDeleted = true;
  } catch (deleteErr: any) {
    logger.warn(`[AssetWorker] Failed to delete rejected object ${objectKey}:`, deleteErr);
    objectDeleteError = deleteErr?.message || 'Failed to delete object from storage';
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: 'error',
      sizeBytes: actualSizeBytes,
      processingError,
      ...(objectDeleted ? {
        storageState: StorageState.purged,
        objectDeletedAt: now,
        objectDeleteError: null,
      } : {
        objectDeleteError,
      })
    },
  });

  logger.warn(`[AssetWorker] Validation rejection: ${processingError}`);
}

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
          select: { id: true, storageState: true, dataset: { select: { ownerUserId: true } } },
        });
        if (!freshAsset) {
          logger.warn(`[AssetWorker] Asset ${assetId} not found; skipping job ${job.id}`);
          return;
        }
        if (freshAsset.storageState === 'purged') {
          logger.info(`[AssetWorker] Asset ${assetId} is purged; skipping processing job ${job.id}`);
          return;
        }

        const ownerUserId = freshAsset.dataset?.ownerUserId;
        if (!ownerUserId) {
          logger.warn(`[AssetWorker] Asset ${assetId} has no dataset owner; skipping job ${job.id}`);
          return;
        }

        // 1. Update status to processing
        await prisma.asset.update({
          where: { id: assetId },
          data: { status: 'processing' },
        });

        // 2. Fetch object from R2
        const { maxFileSizeBytes, userMaxStorageBytes } = getBetaLimits();

        const headCommand = new HeadObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
        });

        const headResponse = await s3Client.send(headCommand);
        const actualSizeBytes = headResponse.ContentLength ?? null;

        if (actualSizeBytes === null) {
          throw new Error('Could not determine uploaded object size.');
        }

        if (actualSizeBytes > maxFileSizeBytes) {
          const maxMb = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
          const actualMb = (actualSizeBytes / (1024 * 1024)).toFixed(1);
          const errorMessage = `Uploaded object exceeds beta file size limit. Max: ${maxMb} MB, actual: ${actualMb} MB.`;

          await rejectUploadedObject({
            assetId,
            objectKey,
            actualSizeBytes,
            processingError: errorMessage,
          });
          return;
        }

        // 3. Total user storage quota check — done before download to avoid wasted bandwidth.
        // Protects against clients lying about fileSize during presigned upload initiation.
        const storageQuotaExceeded = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${ownerUserId}::uuid FOR UPDATE`;

          const storageAgg = await tx.asset.aggregate({
            _sum: { sizeBytes: true },
            where: {
              dataset: { ownerUserId },
              storageState: { not: StorageState.purged },
              id: { not: assetId },
            },
          });

          const currentOtherStorage = Number(storageAgg._sum.sizeBytes || 0);
          return currentOtherStorage + actualSizeBytes > userMaxStorageBytes;
        });

        if (storageQuotaExceeded) {
          const maxMb = (userMaxStorageBytes / (1024 * 1024)).toFixed(1);
          const errorMessage = `Uploaded object exceeds beta total storage limit. Max: ${maxMb} MB.`;

          await rejectUploadedObject({
            assetId,
            objectKey,
            actualSizeBytes,
            processingError: errorMessage,
          });
          return;
        }

        const getCommand = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
        });

        const response = await s3Client.send(getCommand);

        if (!response.Body) {
          throw new Error('Empty response body from S3');
        }

        // 4. Download to buffer for Sharp
        const buffer = await streamToBuffer(response.Body as Readable);

        // 5. Extract metadata
        const metadata = await sharp(buffer).metadata();
        const width = metadata.width;
        const height = metadata.height;
        const finalSizeBytes = Math.max(actualSizeBytes, buffer.length);

        // 6. Mark asset ready
        await prisma.asset.update({
          where: { id: assetId },
          data: {
            status: 'ready',
            width,
            height,
            sizeBytes: finalSizeBytes,
            processingError: null,
            objectDeleteError: null,
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
