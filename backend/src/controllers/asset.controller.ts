import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cacheDelete, cacheDeletePattern } from '../lib/redis';
import { uploadToR2, getSignedUrl, deleteFromR2 } from '../lib/storage';
import logger from '../lib/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attach a signed URL to a single asset record */
async function attachSignedUrl<T extends { objectKey: string }>(
  asset: T,
): Promise<T & { signedUrl: string }> {
  const signedUrl = await getSignedUrl(asset.objectKey);
  return { ...asset, signedUrl };
}

/** Attach signed URLs to a list of asset records */
async function attachSignedUrls<T extends { objectKey: string }>(
  assets: T[],
): Promise<(T & { signedUrl: string })[]> {
  return Promise.all(assets.map((a) => attachSignedUrl(a)));
}

// ---------------------------------------------------------------------------
// Create a new asset (multipart upload)
// ---------------------------------------------------------------------------

export const createAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const file = req.file;
    const { datasetId } = req.body;

    if (!file) {
      throw new BadRequestError('Dosya yüklenmedi. Lütfen bir resim dosyası seçin.');
    }

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

    if (req.user?.role !== 'admin' && dataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('Bu datasete asset ekleme yetkiniz yok.');
    }

    // Build a unique object key
    const ext = path.extname(file.originalname) || '.jpg';
    const objectKey = `assets/${datasetId}/${randomUUID()}${ext}`;

    // Upload to R2
    await uploadToR2(objectKey, file.buffer, file.mimetype);

    // Persist metadata in DB
    const asset = await prisma.asset.create({
      data: {
        datasetId,
        objectKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
      },
    });

    // Return with signed URL
    const signedUrl = await getSignedUrl(objectKey);

    // Update dataset status → ready (assets have been uploaded)
    await prisma.dataset.updateMany({
      where: { id: datasetId, status: { in: ['draft', 'uploading'] } },
      data: { status: 'ready' },
    });

    logger.info(`Asset created: ${asset.id} in dataset ${datasetId}`);

    // Invalidate asset and dataset list caches
    await cacheDeletePattern('cache:/api/assets*');
    await cacheDeletePattern('cache:/api/datasets*');

    res.status(201).json({
      success: true,
      data: { ...asset, signedUrl },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Create multiple assets at once (bulk upload)
// ---------------------------------------------------------------------------

export const createAssetBulk = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const { datasetId } = req.body;

    if (!files || files.length === 0) {
      throw new BadRequestError('En az bir dosya yüklenmelidir.');
    }

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

    if (req.user?.role !== 'admin' && dataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('Bu datasete asset ekleme yetkiniz yok.');
    }

    // Upload all files to R2 and save metadata
    const createdAssets = [];

    for (const file of files) {
      const ext = path.extname(file.originalname) || '.jpg';
      const objectKey = `assets/${datasetId}/${randomUUID()}${ext}`;

      await uploadToR2(objectKey, file.buffer, file.mimetype);

      const asset = await prisma.asset.create({
        data: {
          datasetId,
          objectKey,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });

      const signedUrl = await getSignedUrl(objectKey);
      createdAssets.push({ ...asset, signedUrl });
    }

    // Update dataset status → ready (assets have been uploaded)
    await prisma.dataset.updateMany({
      where: { id: datasetId, status: { in: ['draft', 'uploading'] } },
      data: { status: 'ready' },
    });

    logger.info(`Bulk upload: ${createdAssets.length} assets created in dataset ${datasetId}`);

    // Invalidate asset and dataset list caches
    await cacheDeletePattern('cache:/api/assets*');
    await cacheDeletePattern('cache:/api/datasets*');

    res.status(201).json({
      success: true,
      data: createdAssets,
      count: createdAssets.length,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Get all assets (with pagination and filtering)
// ---------------------------------------------------------------------------

export const getAssets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const datasetId = req.query.datasetId as string | undefined;

    // Build where clause
    const where: any = {};

    if (datasetId) {
      where.datasetId = datasetId;
    }

    // If not admin, only show assets from owned datasets
    if (req.user?.role !== 'admin') {
      where.dataset = {
        ownerUserId: req.user?.id,
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
    const assets = await attachSignedUrls(rawAssets);

    res.json({
      success: true,
      data: assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Get a single asset by ID
// ---------------------------------------------------------------------------

export const getAssetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const rawAsset = await prisma.asset.findUnique({
      where: { id },
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
    if (
      req.user?.role !== 'admin' &&
      rawAsset.dataset.ownerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('Bu asete erişim yetkiniz yok.');
    }

    const asset = await attachSignedUrl(rawAsset);

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Update an asset
// ---------------------------------------------------------------------------

export const updateAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { objectKey, mimeType, width, height, sizeBytes, checksum } = req.body;

    // Check if asset exists and user has access
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      include: {
        dataset: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!existingAsset) {
      throw new NotFoundError('Asset');
    }

    if (req.user?.role !== 'admin' && existingAsset.dataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('Bu aseti güncelleme yetkiniz yok.');
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(objectKey && { objectKey }),
        ...(mimeType && { mimeType }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(sizeBytes !== undefined && { sizeBytes }),
        ...(checksum !== undefined && { checksum }),
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
      },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/assets/${id}`);

    logger.info(`Asset updated: ${asset.id}`);

    const result = await attachSignedUrl(asset);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Delete an asset
// ---------------------------------------------------------------------------

export const deleteAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if asset exists and user has access
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
      include: {
        dataset: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!existingAsset) {
      throw new NotFoundError('Asset');
    }

    if (req.user?.role !== 'admin' && existingAsset.dataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('Bu aseti silme yetkiniz yok.');
    }

    // Delete from R2 first
    try {
      await deleteFromR2(existingAsset.objectKey);
    } catch (r2Err) {
      logger.warn(`Failed to delete object from R2 (key: ${existingAsset.objectKey}): ${r2Err}`);
    }

    await prisma.asset.delete({
      where: { id },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/assets/${id}`);

    logger.info(`Asset deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
