import { Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { cacheDelete } from '../lib/redis';
import logger from '../lib/logger';

// Create a new asset
export const createAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { datasetId, objectKey, mimeType, width, height, sizeBytes, checksum } = req.body;

    // Verify dataset exists and user has access
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      throw new NotFoundError('Dataset');
    }

    if (req.user?.role !== 'admin' && dataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to add assets to this dataset');
    }

    const asset = await prisma.asset.create({
      data: {
        datasetId,
        objectKey,
        mimeType,
        width,
        height,
        sizeBytes,
        checksum,
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
      },
    });

    logger.info(`Asset created: ${asset.id} in dataset ${datasetId}`);

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// Get all assets (with pagination and filtering)
export const getAssets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
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

    const [assets, total] = await Promise.all([
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

// Get a single asset by ID
export const getAssetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        dataset: {
          select: { id: true, name: true, ownerUserId: true },
        },
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset');
    }

    // Check access rights
    if (
      req.user?.role !== 'admin' && 
      asset.dataset.ownerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this asset');
    }

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// Update an asset
export const updateAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
      throw new ForbiddenError('You do not have permission to update this asset');
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

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// Delete an asset
export const deleteAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
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
      throw new ForbiddenError('You do not have permission to delete this asset');
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
