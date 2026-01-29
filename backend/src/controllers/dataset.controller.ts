import { Response, NextFunction } from 'express';
import { DatasetStatus, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { cacheDelete } from '../lib/redis';
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

    const [datasets, total] = await Promise.all([
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

    res.json({
      success: true,
      data: dataset,
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

    // Invalidate cache
    await cacheDelete(`cache:/api/datasets/${id}`);
    await cacheDelete(`cache:/api/datasets`);

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
    });

    if (!existingDataset) {
      throw new NotFoundError('Dataset');
    }

    if (req.user?.role !== 'admin' && existingDataset.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to delete this dataset');
    }

    await prisma.dataset.delete({
      where: { id },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/datasets/${id}`);
    await cacheDelete(`cache:/api/datasets`);

    logger.info(`Dataset deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
