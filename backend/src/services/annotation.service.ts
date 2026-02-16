import { Prisma, UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';

export class AnnotationService {
  /**
   * Create a raw annotation for a task
   * Validates that the user holds the active lease / is the contract labeler
   */
  async createRawAnnotation(taskId: string, labelerId: string, labelerRole: UserRole, payloadJson: unknown) {
    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { contract: true },
    });

    if (!task) {
      throw new NotFoundError('Task');
    }

    // Verify user is the labeler for this task
    if (labelerRole !== 'admin' && task.contract.labelerUserId !== labelerId) {
      throw new ForbiddenError('You are not the labeler for this task');
    }

    const annotation = await prisma.annotationRaw.create({
      data: {
        taskId,
        labelerUserId: labelerId,
        payloadJson: payloadJson as Prisma.InputJsonValue,
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

    return annotation;
  }

  /**
   * Create or update a normalized annotation for a task (upsert)
   */
  async normalizeAnnotation(taskId: string, userId: string, userRole: UserRole, normalizedJson: unknown) {
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
      userRole !== 'admin' &&
      task.contract.clientUserId !== userId &&
      task.contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this task');
    }

    // Create or update normalized annotation
    const normalized = await prisma.annotationNormalized.upsert({
      where: { taskId },
      create: {
        taskId,
        labelerUserId: userId,
        normalizedJson: normalizedJson as Prisma.InputJsonValue,
      },
      update: {
        normalizedJson: normalizedJson as Prisma.InputJsonValue,
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

    return normalized;
  }

  /**
   * Get all annotations (raw + normalized) for a task
   */
  async getTaskAnnotations(taskId: string, userId: string, userRole: UserRole) {
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
      userRole !== 'admin' &&
      task.contract.clientUserId !== userId &&
      task.contract.labelerUserId !== userId
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

    return {
      raw: rawAnnotations,
      normalized: normalizedAnnotation,
    };
  }
}
