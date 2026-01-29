import { Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';

// Create a new labelset with labels
export const createLabelSet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, version, labels } = req.body;
    const userId = req.user!.id;

    const labelSet = await prisma.labelSet.create({
      data: {
        name,
        version: version || 1,
        ownerUserId: userId,
        labels: labels ? {
          create: labels.map((label: any) => ({
            name: label.name,
            color: label.color,
            attributesSchemaJson: label.attributesSchemaJson,
          })),
        } : undefined,
      },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
        labels: true,
      },
    });

    logger.info(`LabelSet created: ${labelSet.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: labelSet,
    });
  } catch (error) {
    next(error);
  }
};

// Get all labelsets (with pagination)
export const getLabelSets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where = req.user?.role === 'admin' 
      ? {} 
      : req.user 
        ? { ownerUserId: req.user.id }
        : {};

    const [labelSets, total] = await Promise.all([
      prisma.labelSet.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: { id: true, email: true, displayName: true },
          },
          _count: {
            select: { labels: true },
          },
        },
      }),
      prisma.labelSet.count({ where }),
    ]);

    res.json({
      success: true,
      data: labelSets,
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

// Get a single labelset by ID with all labels
export const getLabelSetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const labelSet = await prisma.labelSet.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
        labels: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    // Check access rights
    if (
      req.user?.role !== 'admin' && 
      labelSet.ownerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this labelset');
    }

    res.json({
      success: true,
      data: labelSet,
    });
  } catch (error) {
    next(error);
  }
};

// Add a label to a labelset
export const addLabel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color, attributesSchemaJson } = req.body;

    // Check if labelset exists and user has access
    const labelSet = await prisma.labelSet.findUnique({
      where: { id },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    if (req.user?.role !== 'admin' && labelSet.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to modify this labelset');
    }

    const label = await prisma.label.create({
      data: {
        labelSetId: id,
        name,
        color,
        attributesSchemaJson,
      },
    });

    logger.info(`Label created: ${label.id} in labelset ${id}`);

    res.status(201).json({
      success: true,
      data: label,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a labelset
export const deleteLabelSet = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if labelset exists and user has access
    const labelSet = await prisma.labelSet.findUnique({
      where: { id },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    if (req.user?.role !== 'admin' && labelSet.ownerUserId !== req.user?.id) {
      throw new ForbiddenError('You do not have permission to delete this labelset');
    }

    // Delete all labels first, then the labelset
    await prisma.$transaction([
      prisma.label.deleteMany({ where: { labelSetId: id } }),
      prisma.labelSet.delete({ where: { id } }),
    ]);

    logger.info(`LabelSet deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
