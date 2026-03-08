import { Prisma, UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';
import crypto from 'crypto';
import stableStringify from 'fast-json-stable-stringify';

/**
 * Service for admin-only annotation management (debug/reprocess).
 *
 * IMPORTANT — Two annotation submission flows exist:
 *
 * 1. Canonical labeler path: POST /tasks/:id/submit  →  TaskService.submitTask
 *    - Creates raw annotation WITH leaseToken → included in normalize pipeline.
 *
 * 2. Admin debug path: POST /annotations/raw  →  this service
 *    - Creates raw annotation WITHOUT leaseToken → excluded from normalize pipeline
 *      (worker filters lease_token IS NOT NULL).
 *
 * The normalize endpoint (POST /annotations/normalize) is also admin-only and
 * allows manual upsert of normalized data for debugging.
 */
export class AnnotationService {
  /**
   * Compute a stable SHA-256 hash of a JSON payload.
   */
  private computePayloadHash(payload: unknown): string {
    const canonical = stableStringify(payload);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Create a raw annotation for a task (admin-only debug/reprocess endpoint).
   *
   * - Generates payloadHash for DB constraint compliance.
   * - Does NOT set leaseToken so normalize worker ignores these rows
   *   (worker filters lease_token IS NOT NULL).
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

    const payloadHash = this.computePayloadHash(payloadJson);

    const annotation = await prisma.annotationRaw.create({
      data: {
        taskId,
        labelerUserId: labelerId,
        payloadHash,
        // leaseToken intentionally omitted — admin debug rows are excluded
        // from the normalize pipeline (worker filters lease_token IS NOT NULL)
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

    logger.info(`Raw annotation created for task ${taskId} (admin debug)`);

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
    // IMPORTANT: labelerUserId must always be the contract's labeler, not the calling user
    const normalized = await prisma.annotationNormalized.upsert({
      where: { taskId },
      create: {
        taskId,
        labelerUserId: task.contract.labelerUserId,
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
