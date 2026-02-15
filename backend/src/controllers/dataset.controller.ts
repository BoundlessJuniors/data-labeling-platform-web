import { Response, NextFunction } from 'express';
import { DatasetStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cacheDelete, cacheDeletePattern } from '../lib/redis';
import { deleteFromR2 } from '../lib/storage';
import logger from '../lib/logger';

// Create a new dataset
export const createDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, status } = req.body;
    const userId = req.user!.id;

    const dataset = await prisma.dataset.create({
      data: {
        name,
        description,
        status: status || 'draft',
        ownerUserId: userId,
      },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    logger.info(`Dataset created: ${dataset.id} by user ${userId}`);

    // Invalidate all dataset list caches so the new entry appears immediately
    await cacheDeletePattern('cache:/api/datasets*');

    res.status(201).json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    next(error);
  }
};

// Get all datasets (with pagination)
export const getDatasets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where: Prisma.DatasetWhereInput = {};
    
    if (req.user?.role === 'admin') {
      where = {};
    } else if (req.user) {
      where = { ownerUserId: req.user.id };
    } else {
      where = { status: DatasetStatus.ready };
    }

    const [rawDatasets, total] = await Promise.all([
      prisma.dataset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, email: true, displayName: true },
          },
          _count: {
            select: { assets: true, listings: true },
          },
        },
      }),
      prisma.dataset.count({ where }),
    ]);

    // Flatten _count into assetCount / listingCount for the frontend
    const datasets = rawDatasets.map((d) => ({
      ...d,
      assetCount: d._count.assets,
      listingCount: d._count.listings,
      _count: undefined,
    }));

    res.json({
      success: true,
      data: datasets,
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

// Get a single dataset by ID
export const getDatasetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
        assets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { assets: true, listings: true },
        },
      },
    });

    if (!dataset) {
      throw new NotFoundError('Dataset');
    }

    // Check access rights
    if (
      req.user?.role !== 'admin' && 
      dataset.ownerUserId !== req.user?.id &&
      dataset.status !== 'ready'
    ) {
      throw new ForbiddenError('You do not have access to this dataset');
    }

    // Flatten _count for the frontend
    const result = {
      ...dataset,
      assetCount: dataset._count.assets,
      listingCount: dataset._count.listings,
      _count: undefined,
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Update a dataset
export const updateDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    // Check if dataset exists and user has access
    const existingDataset = await prisma.dataset.findUnique({
      where: { id },
    });

    if (!existingDataset) {
      throw new NotFoundError('Dataset');
    }

    if (req.user?.role !== 'admin' && existingDataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to update this dataset');
    }

    const dataset = await prisma.dataset.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    // Invalidate all dataset-related cache keys
    await cacheDeletePattern('cache:/api/datasets*');

    logger.info(`Dataset updated: ${dataset.id}`);

    res.json({
      success: true,
      data: dataset,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a dataset
export const deleteDataset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if dataset exists and user has access
    const existingDataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        _count: { select: { listings: true } },
      },
    });

    if (!existingDataset) {
      throw new NotFoundError('Dataset');
    }

    if (req.user?.role !== 'admin' && existingDataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to delete this dataset');
    }

    // Block deletion if the dataset is linked to any listing
    if (existingDataset._count.listings > 0) {
      throw new BadRequestError(
        'Bu dataset bir ilana bağlı. Önce ilgili ilanı silmeniz gerekiyor.'
      );
    }

    // 1. Fetch all assets so we can clean up MinIO objects
    const assets = await prisma.asset.findMany({
      where: { datasetId: id },
      select: { id: true, objectKey: true },
    });

    // 2. Delete physical files from MinIO / R2
    await Promise.allSettled(
      assets.map((a) => deleteFromR2(a.objectKey))
    );

    // 3. Delete DB records inside a transaction (assets first, then dataset)
    await prisma.$transaction([
      prisma.asset.deleteMany({ where: { datasetId: id } }),
      prisma.dataset.delete({ where: { id } }),
    ]);

    // Invalidate all dataset-related cache keys (covers paginated/filtered variants)
    await cacheDeletePattern('cache:/api/datasets*');

    logger.info(`Dataset deleted: ${id} (${assets.length} assets cleaned up)`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
