import { Prisma, UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';

export class LabelSetService {
  /**
   * Create a new labelset with optional labels
   */
  async createLabelSet(
    userId: string,
    data: {
      name: string;
      version?: number;
      labels?: { name: string; color: string; attributesSchemaJson?: any }[];
    }
  ) {
    const labelSet = await prisma.labelSet.create({
      data: {
        name: data.name,
        version: data.version || 1,
        ownerUserId: userId,
        labels: data.labels
          ? {
              create: data.labels.map((label) => ({
                name: label.name,
                color: label.color,
                attributesSchemaJson: label.attributesSchemaJson,
              })),
            }
          : undefined,
      },
      include: {
        owner: {
          select: { id: true, email: true, displayName: true },
        },
        labels: true,
      },
    });

    logger.info(`LabelSet created: ${labelSet.id} by user ${userId}`);

    return labelSet;
  }

  /**
   * Get all labelsets (with pagination and filtering)
   */
  async getLabelSets(
    page: number,
    limit: number,
    userId: string | undefined,
    userRole: UserRole | undefined
  ) {
    const skip = (page - 1) * limit;

    // Build where clause based on user role
    const where: Prisma.LabelSetWhereInput =
      userRole === 'admin'
        ? {}
        : userId
        ? { ownerUserId: userId }
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

    return {
      labelSets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single labelset by ID
   */
  async getLabelSetById(labelSetId: string, userId: string | undefined, userRole: UserRole | undefined) {
    const labelSet = await prisma.labelSet.findUnique({
      where: { id: labelSetId },
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
    if (userRole !== 'admin' && labelSet.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have access to this labelset');
    }

    return labelSet;
  }

  /**
   * Add a label to a labelset
   */
  async addLabel(
    labelSetId: string,
    userId: string,
    userRole: UserRole,
    data: { name: string; color: string; attributesSchemaJson?: any }
  ) {
    // Check if labelset exists and user has access
    const labelSet = await prisma.labelSet.findUnique({
      where: { id: labelSetId },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    if (userRole !== 'admin' && labelSet.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this labelset');
    }

    const label = await prisma.label.create({
      data: {
        labelSetId,
        name: data.name,
        color: data.color,
        attributesSchemaJson: data.attributesSchemaJson,
      },
    });

    logger.info(`Label created: ${label.id} in labelset ${labelSetId}`);

    return label;
  }

  /**
   * Delete a labelset
   */
  async deleteLabelSet(labelSetId: string, userId: string, userRole: UserRole) {
    // Check if labelset exists and user has access
    const labelSet = await prisma.labelSet.findUnique({
      where: { id: labelSetId },
    });

    if (!labelSet) {
      throw new NotFoundError('LabelSet');
    }

    if (userRole !== 'admin' && labelSet.ownerUserId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this labelset');
    }

    // Delete all labels first, then the labelset
    await prisma.$transaction([
      prisma.label.deleteMany({ where: { labelSetId: labelSetId } }),
      prisma.labelSet.delete({ where: { id: labelSetId } }),
    ]);

    logger.info(`LabelSet deleted: ${labelSetId}`);
  }
}
