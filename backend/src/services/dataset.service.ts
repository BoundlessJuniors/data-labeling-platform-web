import { DatasetStatus, Prisma, UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import { cacheDeletePattern } from '../lib/redis';
import { deleteFromR2 } from '../lib/storage';
import logger from '../lib/logger';

export class DatasetService {
  /**
   * Create a new dataset
   */
  async createDataset(userId: string, data: { name: string; description?: string; status?: DatasetStatus }) {
    const dataset = await prisma.dataset.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status || DatasetStatus.draft,
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
    await cacheDeletePattern('cache:/api/v1/datasets*');

    return dataset;
  }

  /**
   * Get all datasets (with pagination and filtering)
   */
  async getDatasets(
    page: number,
    limit: number,
    userId: string | undefined,
    userRole: UserRole | undefined
  ) {
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let where: Prisma.DatasetWhereInput = {};

    if (userRole === 'admin') {
      where = {};
    } else if (userId) {
      where = { ownerUserId: userId };
    } else {
      // Public view (if we had one, strict logic from controller was: status: ready)
      // Actually controller said: if (req.user) where = { ownerUserId } else where = { status: ready }
      // Assuming this service is called by authenticated users mostly, but keeping logic.
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

    // Flatten _count into assetCount / listingCount
    const datasets = rawDatasets.map((d) => ({
      ...d,
      assetCount: d._count.assets,
      listingCount: d._count.listings,
      _count: undefined,
    }));

    return {
      datasets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single dataset by ID
   */
  async getDatasetById(datasetId: string, userId: string | undefined, userRole: UserRole | undefined) {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
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
      userRole !== 'admin' &&
      dataset.ownerUserId !== userId &&
      dataset.status !== 'ready'
    ) {
      throw new ForbiddenError('You do not have access to this dataset');
    }

    // Flatten _count
    return {
      ...dataset,
      assetCount: dataset._count.assets,
      listingCount: dataset._count.listings,
      _count: undefined,
    };
  }

  /**
   * Update a dataset
   */
  async updateDataset(
    datasetId: string,
    userId: string,
    userRole: UserRole,
    data: { name?: string; description?: string; status?: DatasetStatus }
  ) {
    // Check if dataset exists and user has access
    const existingDataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        _count: { select: { listings: true } },
      },
    });

    if (!existingDataset) {
      throw new NotFoundError('Dataset');
    }

    if (userRole !== 'admin' && existingDataset.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to update this dataset');
    }

    if (existingDataset._count.listings > 0) {
      throw new BadRequestError('Bu dataset bir ilanda kullanıldığı için güncellenemez.');
    }

    const dataset = await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
      },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    // Invalidate all dataset-related cache keys
    await cacheDeletePattern('cache:/api/v1/datasets*');

    logger.info(`Dataset updated: ${dataset.id}`);

    return dataset;
  }

  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId: string, userId: string, userRole: UserRole) {
    // Check if dataset exists and user has access
    const existingDataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      include: {
        _count: { select: { listings: true } },
      },
    });

    if (!existingDataset) {
      throw new NotFoundError('Dataset');
    }

    if (userRole !== 'admin' && existingDataset.ownerUserId !== userId) {
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
      where: { datasetId },
      select: { id: true, objectKey: true },
    });

    // 2. Delete physical files from MinIO / R2
    // We use allSettled to ensure we try to delete all files even if some fail
    await Promise.allSettled(
      assets.map((a) => deleteFromR2(a.objectKey))
    );

    // 3. Delete DB records inside a transaction (assets first, then dataset)
    await prisma.$transaction([
      prisma.asset.deleteMany({ where: { datasetId } }),
      prisma.dataset.delete({ where: { id: datasetId } }),
    ]);

    // Invalidate all dataset-related cache keys
    await cacheDeletePattern('cache:/api/v1/datasets*');

    logger.info(`Dataset deleted: ${datasetId} (${assets.length} assets cleaned up)`);
  }
}
