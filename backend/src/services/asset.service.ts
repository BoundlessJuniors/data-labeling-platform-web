import { Prisma, UserRole } from '@prisma/client';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cacheDelete, cacheDeletePattern } from '../lib/redis';
import { uploadToR2, getSignedUrl, deleteFromR2, getPresignedPutUrl } from '../lib/storage';
import { addAssetJob } from '../lib/queue';
import logger from '../lib/logger';

// Interface for Multer file (since we don't import 'express' here)
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class AssetService {
  /**
   * Helper: Attach a signed URL to a single asset record
   */
  private async attachSignedUrl<T extends { objectKey: string }>(asset: T): Promise<T & { signedUrl: string }> {
    const signedUrl = await getSignedUrl(asset.objectKey);
    return { ...asset, signedUrl };
  }

  /**
   * Helper: Attach signed URLs to a list of asset records
   */
  private async attachSignedUrls<T extends { objectKey: string }>(assets: T[]): Promise<(T & { signedUrl: string })[]> {
    return Promise.all(assets.map((a) => this.attachSignedUrl(a)));
  }

  /**
   * Initiate a single file upload (Direct to R2)
   * Returns a Presigned PUT URL and creates a pending Asset record.
   */
  async initiateUpload(
    userId: string,
    userRole: UserRole,
    datasetId: string,
    filename: string,
    contentType: string,
  ) {
    if (!datasetId) {
      throw new BadRequestError('Dataset ID zorunludur.');
    }

    // Verify dataset exists and user has access
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      throw new NotFoundError('Dataset');
    }

    if (userRole !== 'admin' && dataset.ownerUserId !== userId) {
      throw new ForbiddenError('Bu datasete asset ekleme yetkiniz yok.');
    }

    // Build a unique object key
    const ext = path.extname(filename) || '';
    const objectKey = `assets/${datasetId}/${randomUUID()}${ext}`;

    // Create pending asset record
    const asset = await prisma.asset.create({
      data: {
        datasetId,
        objectKey,
        mimeType: contentType,
        status: 'pending',
      },
    });

    // Generate Presigned PUT URL
    const signedUrl = await getPresignedPutUrl(objectKey, contentType);

    return {
      signedUrl,
      assetId: asset.id,
      objectKey,
    };
  }

  /**
   * Complete an upload
   * Verifies the asset exists and triggers the processing job.
   */
  async completeUpload(userId: string, userRole: UserRole, assetId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: { select: { ownerUserId: true, id: true } },
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset');
    }

    if (userRole !== 'admin' && asset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError('Bu işlem için yetkiniz yok.');
    }

    // Update status to 'uploaded' (processing will start)
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'uploaded' },
    });

    // Add to queue
    await addAssetJob(asset.id, asset.objectKey);

     // Update dataset status → ready (if not already)
     // Note: In a real bulk scenario, this might be too frequent, but safe for now.
     if (asset.dataset) {
      await prisma.dataset.updateMany({
        where: { id: asset.datasetId, status: { in: ['draft', 'uploading'] } },
        data: { status: 'ready' },
      });
     }

    logger.info(`Asset upload confirmed: ${assetId} -> Queued for processing`);

    // Invalidate caches
    await cacheDeletePattern('cache:/api/assets*');
    await cacheDeletePattern('cache:/api/datasets*');

    return this.attachSignedUrl(updatedAsset);
  }

  /**
   * Get all assets (with pagination and filtering)
   */
  async getAssets(
    page: number,
    limit: number,
    userId: string | undefined,
    userRole: UserRole | undefined,
    datasetId?: string
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {};

    if (datasetId) {
      where.datasetId = datasetId;
    }

    // If not admin, only show assets from owned datasets
    if (userRole !== 'admin') {
      where.dataset = {
        ownerUserId: userId,
      };
    }

    const [rawAssets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          dataset: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    // Attach signed URLs
    const assets = await this.attachSignedUrls(rawAssets);

    return {
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single asset by ID
   */
  async getAssetById(assetId: string, userId: string | undefined, userRole: UserRole | undefined) {
    const rawAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: {
          select: { id: true, name: true, ownerUserId: true },
        },
      },
    });

    if (!rawAsset) {
      throw new NotFoundError('Asset');
    }

    // Check access rights
    if (userRole !== 'admin' && rawAsset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError('Bu asete erişim yetkiniz yok.');
    }

    return this.attachSignedUrl(rawAsset);
  }

  /**
   * Update an asset
   */
  async updateAsset(
    assetId: string,
    userId: string,
    userRole: UserRole,
    data: {
      objectKey?: string;
      mimeType?: string;
      width?: number;
      height?: number;
      sizeBytes?: number;
      checksum?: string;
    }
  ) {
    // Check if asset exists and user has access
    const existingAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!existingAsset) {
      throw new NotFoundError('Asset');
    }

    if (userRole !== 'admin' && existingAsset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError('Bu aseti güncelleme yetkiniz yok.');
    }

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(data.objectKey && { objectKey: data.objectKey }),
        ...(data.mimeType && { mimeType: data.mimeType }),
        ...(data.width !== undefined && { width: data.width }),
        ...(data.height !== undefined && { height: data.height }),
        ...(data.sizeBytes !== undefined && { sizeBytes: data.sizeBytes }),
        ...(data.checksum !== undefined && { checksum: data.checksum }),
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
      },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/assets/${assetId}`);

    logger.info(`Asset updated: ${asset.id}`);

    return this.attachSignedUrl(asset);
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string, userId: string, userRole: UserRole) {
    // Check if asset exists and user has access
    const existingAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!existingAsset) {
      throw new NotFoundError('Asset');
    }

    if (userRole !== 'admin' && existingAsset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError('Bu aseti silme yetkiniz yok.');
    }

    // Delete from R2 first
    try {
      await deleteFromR2(existingAsset.objectKey);
    } catch (r2Err) {
      logger.warn(`Failed to delete object from R2 (key: ${existingAsset.objectKey}): ${r2Err}`);
    }

    await prisma.asset.delete({
      where: { id: assetId },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/assets/${assetId}`);

    logger.info(`Asset deleted: ${assetId}`);
  }
}
