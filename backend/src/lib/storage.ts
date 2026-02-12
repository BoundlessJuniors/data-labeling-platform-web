/**
 * Cloudflare R2 (S3 Compatible) Storage Utility
 *
 * Provides helpers for uploading, downloading (via signed URL),
 * and deleting objects in R2.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from './logger';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? '';

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  logger.warn(
    'R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not fully set. File uploads will fail.',
  );
}

// ---------------------------------------------------------------------------
// S3 Client (R2-compatible)
// ---------------------------------------------------------------------------

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Upload a file buffer to R2.
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  logger.info(`Uploaded to R2: ${key}`);
}

/**
 * Generate a time-limited signed URL for reading an object from R2.
 * @param key  - The object key in the bucket.
 * @param expiresIn - Seconds until the URL expires (default 1 hour).
 */
export async function getSignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return awsGetSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete an object from R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  logger.info(`Deleted from R2: ${key}`);
}
