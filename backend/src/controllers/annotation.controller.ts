import { Response, NextFunction } from 'express';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';

// Create raw annotation
export const createRawAnnotation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, payloadJson } = req.body;
    const labelerId = req.user!.id;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Verify user is the labeler for this task
    if (req.user?.role !== 'admin' && task.contract.labelerUserId !== labelerId) {
      throw new ForbiddenError('You are not the labeler for this task');
    }

    const annotation = await prisma.annotationRaw.create({
      data: {
        taskId,
        labelerUserId: labelerId,
        payloadJson,
      },
      include: {
        task: {
          select: { id: true, status: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    logger.info(`Raw annotation created for task ${taskId}`);

    res.status(201).json({
      success: true,
      data: annotation,
    });
  } catch (error) {
    next(error);
  }
};

// Normalize annotation (create or update normalized version)
export const normalizeAnnotation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { taskId, normalizedJson } = req.body;
    const labelerId = req.user!.id;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Only labeler, client or admin can normalize
    if (
      req.user?.role !== 'admin' &&
      task.contract.clientUserId !== req.user?.id &&
      task.contract.labelerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this task');
    }

    // Create or update normalized annotation
    const normalized = await prisma.annotationNormalized.upsert({
      where: { taskId },
      create: {
        taskId,
        labelerUserId: labelerId,
        normalizedJson,
      },
      update: {
        normalizedJson,
        version: { increment: 1 },
      },
      include: {
        task: {
          select: { id: true, status: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    logger.info(`Annotation normalized for task ${taskId}`);

    res.json({
      success: true,
      data: normalized,
    });
  } catch (error) {
    next(error);
  }
};

// Get annotations for a task
export const getTaskAnnotations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: taskId } = req.params;

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Check access rights
    if (
      req.user?.role !== 'admin' &&
      task.contract.clientUserId !== req.user?.id &&
      task.contract.labelerUserId !== req.user?.id
    ) {
      throw new ForbiddenError('You do not have access to this task');
    }

    const [rawAnnotations, normalizedAnnotation] = await Promise.all([
      prisma.annotationRaw.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        include: {
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
      prisma.annotationNormalized.findUnique({
        where: { taskId },
        include: {
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        raw: rawAnnotations,
        normalized: normalizedAnnotation,
      },
    });
  } catch (error) {
    next(error);
  }
};
