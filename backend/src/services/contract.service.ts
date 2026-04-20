import { ContractStatus, ListingStatus, Prisma, SubmissionStatus, TaskStatus } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';
import { addNormalizeJob } from '../lib/queue';
import { getSignedUrl } from '../lib/storage';
import { ExportFormat, ExportableTaskRecord } from '../utils/export/export.types';
import { extractBboxes } from '../utils/export/export.helpers';
import { exportCoco } from '../utils/export/coco.export';
import { exportYolo } from '../utils/export/yolo.export';
import { exportVoc } from '../utils/export/voc.export';
import { auditService } from './audit.service';
/**
 * Service layer for contract lifecycle management.
 *
 * ARCHITECTURAL NOTE:
 *   Contract creation happens exclusively through ProposalService.acceptProposal.
 *   There is intentionally no createContract method here.
 *   The canonical flow is: proposal → accept proposal → contract + tasks.
 */
export class ContractService {

  /**
   * Get all contracts with filtering and pagination
   */
  async getContracts(
    page: number,
    limit: number,
    userId: string,
    userRole: UserRole,
    status?: string,
    ownOnly?: boolean
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ContractWhereInput = {};

    if (status) {
      where.status = status as ContractStatus;
    }

    // ── Role-based filtering ──────────────────────────────────────────
    // admin + !ownOnly  → no restriction (sees all contracts)
    // admin + ownOnly   → contracts where admin is directly involved
    // client            → only contracts where clientUserId = self
    // labeler           → only contracts where labelerUserId = self
    if (userRole === 'admin') {
      if (ownOnly) {
        where.OR = [
          { clientUserId: userId },
          { labelerUserId: userId },
        ];
      }
      // else: admin sees all — no additional filter
    } else if (userRole === 'client') {
      where.clientUserId = userId;
    } else if (userRole === 'labeler') {
      where.labelerUserId = userId;
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          listing: {
            select: { id: true, title: true },
          },
          client: {
            select: { id: true, email: true, displayName: true },
          },
          labeler: {
            select: { id: true, email: true, displayName: true },
          },
          tasks: {
            select: { status: true },
          },
          _count: {
            select: { tasks: true },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    return {
      contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single contract by ID with access control
   */
  async getContractById(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            dataset: {
              select: { id: true, name: true },
            },
            labelSet: {
              include: { labels: true },
            },
          },
        },
        client: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
        labeler: {
          select: { id: true, email: true, displayName: true, ratingAvg: true },
        },
        tasks: {
          select: { id: true, status: true },
        },
        _count: {
          select: { tasks: true, payments: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Check access rights
    if (
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this contract');
    }

    return contract;
  }

  /**
   * Get labeling context for a contract.
   * Returns only contract-level labeling metadata, keeping payload minimal.
   * Does NOT include tasks, submissions, or full user objects.
   */
  async getLabelingContext(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            labelSet: {
              include: {
                labels: {
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Check access rights using the same rule as getContractById
    if (
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have access to this contract');
    }

    return {
      contract: {
        id: contract.id,
        status: contract.status,
        listingId: contract.listingId,
        clientUserId: contract.clientUserId,
        labelerUserId: contract.labelerUserId,
      },
      listing: {
        id: contract.listing.id,
        title: contract.listing.title,
        description: contract.listing.description,
        annotationFormat: contract.listing.annotationFormat,
        labelingSpecJson: contract.listing.labelingSpecJson,
        qcMode: contract.listing.qcMode,
        labelSetId: contract.listing.labelSetId,
        labelSetVersion: contract.listing.labelSetVersion,
      },
      labelSet: contract.listing.labelSet ? {
        id: contract.listing.labelSet.id,
        name: contract.listing.labelSet.name,
        version: contract.listing.labelSet.version,
        labels: contract.listing.labelSet.labels.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
          attributesSchemaJson: label.attributesSchemaJson,
        })),
      } : null,
    };
  }

  /**
   * Submit a contract (labeler submits completed work).
   * Creates a Submission record and enqueues a normalize job.
   */
  async submitContract(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only labeler or admin can submit
    if (userRole !== 'admin' && contract.labelerUserId !== userId) {
      throw new ForbiddenError('Only the labeler can submit this contract');
    }

    // Can only submit active or revision_requested contracts
    if (contract.status !== ContractStatus.active && contract.status !== ContractStatus.revision_requested) {
      throw new BadRequestError(`Cannot submit contract with status: ${contract.status}`);
    }

    // Check if any tasks are still incomplete (ready, leased, or rejected)
    const incompleteTasks = await prisma.task.count({
      where: {
        contractId,
        status: {
          in: ['ready', 'leased', 'rejected'],
        },
      },
    });

    if (incompleteTasks > 0) {
      throw new BadRequestError('Cannot submit contract. All tasks must be submitted or accepted before handing over.');
    }

    // Validate every task has at least 1 valid raw annotation.
    // "Valid" = leaseToken IS NOT NULL (not admin debug) AND labelerUserId matches contract.
    // This aligns with the normalize worker's lease_token IS NOT NULL filter.
    const tasksWithoutValidRaw = await prisma.task.findMany({
      where: {
        contractId,
        annotationsRaw: {
          none: {
            leaseToken: { not: null },
            labelerUserId: contract.labelerUserId,
          },
        },
      },
      select: { id: true },
      take: 1,
    });

    if (tasksWithoutValidRaw.length > 0) {
      throw new BadRequestError(
        `Cannot submit contract. Every task must have at least one valid raw annotation (lease_token != null, correct labeler). First failing task: ${tasksWithoutValidRaw[0].id}`
      );
    }

    // Update contract status to submitted
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.submitted,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // --- Submission + Normalize Job (idempotent) ---
    // Find the latest submission for this contract (any status)
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        contractId,
        format: 'CUSTOM_JSON',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingSubmission && (existingSubmission.status === 'processing' || existingSubmission.status === 'completed')) {
      // Already in-flight or done — do not enqueue again
      logger.info(`Normalize submission already exists for contract ${contractId} (status: ${existingSubmission.status})`);
    } else {
      // Reuse pending/failed submission or create new
      let submission = existingSubmission;
      if (!submission || (submission.status !== 'pending' && submission.status !== 'failed')) {
        submission = await prisma.submission.create({
          data: {
            contractId,
            labelerUserId: contract.labelerUserId,
            format: 'CUSTOM_JSON',
            s3Key: 'db://annotations_raw',
            status: SubmissionStatus.pending,
          },
        });
      }

      // Enqueue normalize job — submission stays 'pending' until worker starts (worker sets 'processing')
      try {
        await addNormalizeJob(contractId, submission.id);
        logger.info(`Normalize job enqueued for contract ${contractId}, submission ${submission.id}`);
      } catch (enqueueError: unknown) {
        const errorMessage = enqueueError instanceof Error ? enqueueError.message : 'Unknown enqueue error';
        await prisma.submission.update({
          where: { id: submission.id },
          data: { status: SubmissionStatus.failed, errorMessage },
        });
        logger.error(`Failed to enqueue normalize job for contract ${contractId}:`, enqueueError);
      }
    }

    logger.info(`Contract submitted: ${contractId}`);

    return updatedContract;
  }

  /**
   * Approve a contract (client approves labeler's work).
   * Requires normalization to be completed first.
   */
  async approveContract(contractId: string, userId: string, userRole: UserRole) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can approve
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can approve this contract');
    }

    // Can only approve submitted contracts
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot approve contract with status: ${contract.status}`);
    }

    // Gate: normalization must be completed
    const completedSubmission = await prisma.submission.findFirst({
      where: { contractId, format: 'CUSTOM_JSON', status: 'completed' },
    });
    if (!completedSubmission) {
      throw new BadRequestError('Normalization is not completed yet. Cannot approve contract.');
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.approved,
        completedAt: new Date(),
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Update listing status to completed
    await prisma.listing.update({
      where: { id: contract.listingId },
      data: { status: ListingStatus.completed },
    });

    if (userRole === 'admin') {
      await auditService.logAction(userId, 'contract.approve', 'contract', contractId, {
        clientUserId: contract.clientUserId,
      });
    }

    logger.info(`Contract approved: ${contractId}`);

    return updatedContract;
  }

  /**
   * Reject a contract (client rejects labeler's work → revision_requested).
   * Requires normalization to be completed first.
   * Resets all submitted/accepted task statuses to 'rejected' so labeler can re-lease.
   */
  async rejectContract(contractId: string, userId: string, userRole: UserRole, reason?: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can reject
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can reject this contract');
    }

    // Can only reject submitted contracts
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`Cannot reject contract with status: ${contract.status}`);
    }

    // Gate: normalization must be completed
    const completedSubmission = await prisma.submission.findFirst({
      where: { contractId, format: 'CUSTOM_JSON', status: 'completed' },
    });
    if (!completedSubmission) {
      throw new BadRequestError('Normalization is not completed yet. Cannot reject contract.');
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.revision_requested,
        revisionReason: reason || null,
        revisionRequestedAt: new Date(),
        revisionCount: { increment: 1 },
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Reset task statuses so labeler can re-lease and re-work them.
    // Submitted/accepted tasks → rejected (eligible for re-lease).
    await prisma.task.updateMany({
      where: {
        contractId,
        status: { in: [TaskStatus.submitted, TaskStatus.accepted] },
      },
      data: { status: TaskStatus.rejected },
    });

    // Invalidate the old completed submission so a new normalize cycle can run
    // after re-submission.
    if (completedSubmission) {
      await prisma.submission.update({
        where: { id: completedSubmission.id },
        data: { status: SubmissionStatus.failed, errorMessage: 'Invalidated due to contract revision' },
      });
    }

    logger.info(`Contract revision requested: ${contractId}, reason: ${reason || 'No reason provided'}`);

    // Ensure listing remains in_progress during revision cycle
    await prisma.listing.update({
      where: { id: contract.listingId },
      data: { status: ListingStatus.in_progress },
    });

    if (userRole === 'admin') {
      await auditService.logAction(userId, 'contract.reject', 'contract', contractId, {
        reason: reason || null,
        clientUserId: contract.clientUserId,
      });
    }

    return updatedContract;
  }

  /**
   * Cancel a contract (client, labeler, or admin)
   */
  async cancelContract(contractId: string, userId: string, userRole: UserRole, reason?: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Client, labeler, or admin can cancel
    if (
      userRole !== 'admin' &&
      contract.clientUserId !== userId &&
      contract.labelerUserId !== userId
    ) {
      throw new ForbiddenError('You do not have permission to cancel this contract');
    }

    // Can only cancel active contracts
    if (contract.status !== ContractStatus.active) {
      throw new BadRequestError(`Cannot cancel contract with status: ${contract.status}`);
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.cancelled,
      },
      include: {
        listing: { select: { id: true, title: true } },
        client: { select: { id: true, email: true, displayName: true } },
        labeler: { select: { id: true, email: true, displayName: true } },
      },
    });

    // Reopen the listing
    await prisma.listing.update({
      where: { id: contract.listingId },
      data: { status: ListingStatus.open },
    });

    logger.info(`Contract cancelled: ${contractId}, reason: ${reason || 'No reason provided'}`);

    if (userRole === 'admin') {
      await auditService.logAction(userId, 'contract.cancel', 'contract', contractId, {
        reason: reason || null,
      });
    }

    return updatedContract;
  }

  /**
   * Get a QC sample of tasks for a submitted contract.
   * Returns random task IDs with minimal metadata for the client to review.
   *
   * Requirements:
   *   - Contract must be submitted
   *   - Normalization must be completed (Submission status = completed)
   *   - Only client or admin can access
   */
  async getQcSample(contractId: string, userId: string, userRole: UserRole, size: number = 100) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can access QC samples');
    }

    // Contract must be submitted
    if (contract.status !== ContractStatus.submitted) {
      throw new BadRequestError(`QC sample is only available for submitted contracts (current: ${contract.status})`);
    }

    // Normalization must be completed
    const completedSubmission = await prisma.submission.findFirst({
      where: { contractId, format: 'CUSTOM_JSON', status: 'completed' },
    });
    if (!completedSubmission) {
      throw new BadRequestError('Normalization is not completed yet. QC sample not available.');
    }

    // Fetch all task IDs for this contract, then shuffle in application layer
    // (avoids ORDER BY random() performance issues on large tables)
    const allTasks = await prisma.task.findMany({
      where: { contractId },
      select: {
        id: true,
        status: true,
        asset: {
          select: { id: true, objectKey: true, mimeType: true, width: true, height: true },
        },
      },
    });

    // Fisher-Yates shuffle
    const shuffled = [...allTasks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take requested sample size
    const sampleSize = Math.min(size, shuffled.length);
    const sample = shuffled.slice(0, sampleSize);

    // Generate signed URLs for each sample task's asset
    const tasksWithUrls = await Promise.all(
      sample.map(async (task) => {
        let imageUrl: string | null = null;
        if (task.asset?.objectKey) {
          try {
            imageUrl = await getSignedUrl(task.asset.objectKey, 3600);
          } catch (err) {
            logger.warn(`Failed to generate signed URL for asset ${task.asset?.id}:`, err);
          }
        }
        return { ...task, imageUrl };
      })
    );

    return {
      contractId,
      totalTasks: allTasks.length,
      sampleSize: tasksWithUrls.length,
      tasks: tasksWithUrls,
    };
  }

  /**
   * Retry normalize job for a contract (admin only).
   * Finds the latest failed/pending submission or creates a new one, then enqueues.
   */
  async retryNormalize(contractId: string, userId: string, userRole: UserRole) {
    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admin can retry normalize');
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Find latest retryable submission (failed or pending)
    let submission = await prisma.submission.findFirst({
      where: {
        contractId,
        format: 'CUSTOM_JSON',
        status: { in: ['failed', 'pending'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!submission) {
      // No retryable submission — create a new one
      submission = await prisma.submission.create({
        data: {
          contractId,
          labelerUserId: contract.labelerUserId,
          format: 'CUSTOM_JSON',
          s3Key: 'db://annotations_raw',
          status: SubmissionStatus.pending,
        },
      });
    }

    // Enqueue normalize job
    try {
      await addNormalizeJob(contractId, submission.id);
      logger.info(`Normalize retry enqueued for contract ${contractId}, submission ${submission.id}`);
      
      await auditService.logAction(userId, 'contract.normalize_retry', 'contract', contractId, {
        submissionId: submission.id,
      });
      
    } catch (enqueueError: unknown) {
      const errorMessage = enqueueError instanceof Error ? enqueueError.message : 'Unknown enqueue error';
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.failed, errorMessage },
      });
      throw new BadRequestError(`Failed to enqueue normalize job: ${errorMessage}`);
    }


    return { submissionId: submission.id, status: 'processing' };
  }

  /**
   * Export an approved contract's labeling outputs in a specific format.
   * Only accessible by client or admin.
   */
  async exportContract(contractId: string, userId: string, userRole: UserRole, format: ExportFormat) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            labelSet: {
              include: { labels: true },
            },
          },
        },
        tasks: {
          include: {
            asset: true,
            annotationNormalized: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    // Only client or admin can export
    if (userRole !== 'admin' && contract.clientUserId !== userId) {
      throw new ForbiddenError('Only the client can export this contract');
    }

    if (contract.status !== ContractStatus.approved) {
      throw new BadRequestError(`Cannot export contract with status: ${contract.status}. Status must be 'approved'.`);
    }

    const labels = contract.listing.labelSet?.labels || [];
    if (labels.length === 0) {
      throw new BadRequestError('Labeling set has no labels.');
    }

    const exportableTasks: ExportableTaskRecord[] = [];

    for (const task of contract.tasks) {
      if (!task.annotationNormalized || !task.annotationNormalized.normalizedJson) {
        throw new BadRequestError(`Task ${task.id} does not have a normalized annotation. All tasks must be completed for export.`);
      }

      if (!task.asset) {
        throw new BadRequestError(`Task ${task.id} is missing an associated asset.`);
      }

      const payload = task.annotationNormalized.normalizedJson as any;
      if (payload.type !== 'export' || !Array.isArray(payload.data)) {
        throw new BadRequestError(`Task ${task.id} has an invalid normalized payload format.`);
      }

      const bboxes = extractBboxes(payload.data, labels);

      exportableTasks.push({
        taskId: task.id,
        objectKey: task.asset.objectKey,
        basename: task.asset.objectKey.split('/').pop() || `task-${task.id}.jpg`,
        width: task.asset.width || 0,
        height: task.asset.height || 0,
        bboxes,
      });
    }

    switch (format) {
      case 'COCO':
        return exportCoco(contractId, exportableTasks, labels);
      case 'YOLO':
        // YOLO and VOC normally require width and height to be > 0.
        const missingDimensions = exportableTasks.find(t => t.width === 0 || t.height === 0);
        if (missingDimensions) {
          throw new BadRequestError(`Task ${missingDimensions.taskId} has an asset (key: ${missingDimensions.objectKey}) with missing width or height. This is required for YOLO logic.`);
        }
        return exportYolo(contractId, exportableTasks, labels);
      case 'VOC':
        return exportVoc(contractId, exportableTasks, labels);
      default:
        throw new BadRequestError(`Unsupported export format: ${format}`);
    }
  }
}
