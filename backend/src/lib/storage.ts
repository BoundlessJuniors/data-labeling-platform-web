/**
 * S3-Compatible Storage Utility
 *
 * In development → connects to a local MinIO instance.
 * In production  → connects to Cloudflare R2.
 *
 * Provides helpers for uploading, downloading (via signed URL),
 * deleting objects, and ensuring the target bucket exists.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';
import logger from './logger';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? '';
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? '';

/**
 * Parse and validate the storage CORS allowed-origins list from env.
 * Rules enforced:
 *  - Wildcard "*" is always rejected.
 *  - Invalid URLs are silently dropped (with a warning).
 *  - Production additionally rejects:
 *      - http:// origins (must be https)
 *      - localhost / 127.0.0.1 origins
 *  - Duplicates are removed.
 *
 * @param forProduction - pass true when NODE_ENV === 'production'
 */
function getStorageAllowedOrigins(forProduction = false): string[] {
  const raw = process.env.STORAGE_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '';
  const entries = raw.split(',').map(s => s.trim()).filter(Boolean);

  const validated: string[] = [];

  for (const entry of entries) {
    // Never allow wildcard.
    if (entry === '*') {
      logger.warn(`[Storage] CORS: wildcard "*" is not permitted and will be ignored.`);
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(entry);
    } catch {
      logger.warn(`[Storage] CORS: invalid origin URL "${entry}" will be ignored.`);
      continue;
    }

    // Use the normalized origin (scheme + host + port) to strip any path/query.
    const normalized = parsed.origin;

    if (forProduction) {
      // Production requires HTTPS.
      if (parsed.protocol !== 'https:') {
        logger.warn(`[Storage] CORS: non-HTTPS origin "${normalized}" is not permitted in production and will be ignored.`);
        continue;
      }
      // Production must not allow localhost or loopback.
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        logger.warn(`[Storage] CORS: localhost/loopback origin "${normalized}" is not permitted in production and will be ignored.`);
        continue;
      }
    }

    validated.push(normalized);
  }

  // Deduplicate while preserving order.
  return [...new Set(validated)];
}

const isDevelopment = process.env.NODE_ENV !== 'production';

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  logger.warn(
    'Storage environment variables (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not fully set. File uploads will fail.',
  );
}

// ---------------------------------------------------------------------------
// S3 Client — MinIO (dev) / Cloudflare R2 (prod)
// ---------------------------------------------------------------------------

function buildS3Client(): S3Client {
  // ---------- Development: MinIO ----------
  if (isDevelopment && MINIO_ENDPOINT) {
    logger.info(`Using MinIO at ${MINIO_ENDPOINT} for object storage`);
    return new S3Client({
      region: 'us-east-1',
      endpoint: MINIO_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true, // MinIO requires path-style: endpoint/bucket/key
      // Disable TLS certificate validation for local MinIO over HTTP
      ...(MINIO_ENDPOINT.startsWith('https')
        ? {
            requestHandler: new NodeHttpHandler({
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            }),
          }
        : {}),
    });
  }

  // ---------- Production: Cloudflare R2 ----------
  logger.info('Using Cloudflare R2 for object storage');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export const s3Client = buildS3Client();

// ---------------------------------------------------------------------------
// Bucket Bootstrapping
// ---------------------------------------------------------------------------

/**
 * Ensure the target bucket exists.
 * - If the bucket is already present → logs success.
 * - If missing → creates it automatically (dev) or logs an error (prod).
 */
export async function ensureBucket(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
    logger.info(`✅ Bucket "${R2_BUCKET_NAME}" is ready`);
  } catch (error: any) {
    // Bucket does not exist or we have no access
    if (
      error.name === 'NotFound' ||
      error.name === 'NoSuchBucket' ||
      error.$metadata?.httpStatusCode === 404 ||
      error.$metadata?.httpStatusCode === 403
    ) {
      if (isDevelopment) {
        logger.info(`Bucket "${R2_BUCKET_NAME}" not found — creating it now…`);
        try {
          await s3Client.send(
            new CreateBucketCommand({ Bucket: R2_BUCKET_NAME }),
          );
          logger.info(`✅ Bucket "${R2_BUCKET_NAME}" created successfully`);
        } catch (createErr) {
          logger.error(
            `❌ Failed to create bucket "${R2_BUCKET_NAME}". ` +
              `Make sure MinIO is running at ${MINIO_ENDPOINT}. Error:`,
            createErr,
          );
        }
      } else {
        logger.error(
          `❌ Bucket "${R2_BUCKET_NAME}" does not exist on Cloudflare R2. ` +
            `Please create it manually via the Cloudflare dashboard.`,
        );
      }
    } else {
      logger.error(
        `❌ Could not verify bucket "${R2_BUCKET_NAME}". ` +
          `Check your storage credentials and connectivity. Error:`,
        error,
      );
    }
  }

  // Apply CORS policy to allow direct browser uploads.
  // Production: CORS is managed manually in Cloudflare Dashboard so narrow
  // object-only R2 tokens do not need bucket policy write permissions.
  // Development: uses STORAGE_ALLOWED_ORIGINS / ALLOWED_ORIGINS with a safe localhost fallback.
  // Wildcard "*" is never used in either environment.
  if (!isDevelopment) {
    logger.info('[Storage] CORS is managed manually in production; skipping automatic CORS configuration.');
    return;
  }

  try {
    const configuredOrigins = getStorageAllowedOrigins(false);
    const allowedOrigins = configuredOrigins.length > 0
      ? configuredOrigins
      : ['http://localhost:5173', 'http://localhost:3000'];
    logger.info(`[Storage] CORS dev origins: ${allowedOrigins.join(', ')}`);

    const corsCommand = new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            // Narrow headers: only Content-Type and AWS-specific signing headers.
            AllowedHeaders: ['Content-Type', 'x-amz-*'],
            // Narrow methods: only what direct upload + read + existence-check need.
            AllowedMethods: ['PUT', 'GET', 'HEAD'],
            AllowedOrigins: allowedOrigins,
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    await s3Client.send(corsCommand);
    logger.info(`✅ CORS configuration applied to bucket "${R2_BUCKET_NAME}"`);
  } catch (corsErr) {
    logger.warn(`⚠️ Failed to apply CORS configuration (dev, non-fatal):`, corsErr);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Upload a file buffer to the storage bucket.
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
  logger.info(`Uploaded to storage: ${key}`);
}

/**
 * Generate a time-limited signed URL for reading an object.
 * @param key       - The object key in the bucket.
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
 * Download an object directly as a Buffer.
 * Useful when constructing zip archives in-memory.
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error(`Object body is empty for key: ${key}`);
  }

  // Transform the response stream to a Buffer
  const stream = response.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Generate a time-limited signed URL for UPLOADING an object (PUT).
 * @param key         - The object key in the bucket.
 * @param contentType - The MIME type of the file.
 * @param expiresIn   - Seconds until the URL expires (default 5 minutes).
 */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return awsGetSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete an object from the storage bucket.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  logger.info(`Deleted from storage: ${key}`);
}

/**
 * Idempotent variant of deleteFromR2.
 * Returns true if the object was deleted or was already absent.
 * Throws only on genuine storage errors (auth failures, network errors, etc.).
 */
export async function deleteFromR2Safe(key: string): Promise<boolean> {
  try {
    await deleteFromR2(key);
    return true;
  } catch (err: any) {
    // S3/R2/MinIO return NoSuchKey or a 404 when the object does not exist.
    // Treat both as a successful delete (idempotent).
    const code: string | undefined = err?.Code ?? err?.code ?? err?.name;
    const status: number | undefined = err?.$metadata?.httpStatusCode;
    if (code === 'NoSuchKey' || status === 404) {
      logger.info(`Object already absent in storage (idempotent delete): ${key}`);
      return true;
    }
    throw err;
  }
}

/**
 * Fetch HEAD metadata for an object without downloading its body.
 * Returns the content-type, content-length, and ETag reported by storage.
 *
 * Throws an error (not silently) if the object does not exist or the
 * request fails — callers should treat any thrown error as "object absent"
 * or a genuine storage failure and act accordingly.
 */
export async function getObjectMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  etag?: string;
}> {
  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    etag: response.ETag,
  };
}
