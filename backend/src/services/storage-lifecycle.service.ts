/**
 * Storage Lifecycle Service
 *
 * Manages the automatic purge of source image objects from S3-compatible
 * storage (MinIO / Cloudflare R2) after an approved contract's retention
 * window has elapsed.
 *
 * KEY INVARIANT: DB records (Dataset, Asset, Task, Annotation*, Contract,
 * Payment, EscrowLedger, Submission, AuditLog) are NEVER deleted.
 * Only the physical object referenced by Asset.objectKey is removed.
 *
 * States (StorageState enum):
 *   active           → default; objects exist in storage
 *   purge_scheduled  → cleanup enqueued; objects still present
 *   purging          → deletion in progress
 *   purged           → all objects deleted; metadata intact
 *   purge_failed     → at least one object deletion failed; eligible for retry
 */

import { StorageState, ContractStatus } from '@prisma/client';
import prisma from '../lib/db';
import { deleteFromR2Safe } from '../lib/storage';
import { addStoragePurgeJob } from '../lib/queue';
import { auditService } from './audit.service';
import { invalidateApiCache } from '../lib/redis';
import logger from '../lib/logger';

// Number of days after contract.approvedAt before purge becomes eligible.
const RETENTION_DAYS = Number(process.env.STORAGE_RETENTION_DAYS ?? 7);
// Maximum datasets processed per scan batch.
const BATCH_SIZE = Number(process.env.STORAGE_CLEANUP_BATCH_SIZE ?? 50);
// Milliseconds after which a dataset stuck in `purging` state is considered stale
// and eligible for retry by the reconciliation scan (default: 6 hours).
const STALE_PURGING_MS = Number(process.env.STORAGE_PURGING_STALE_AFTER_MS ?? 21600000);

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export class StorageLifecycleService {
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Schedule object storage cleanup for the dataset linked to a contract,
   * triggered immediately after the contract reaches the `approved` state.
   *
   * Safe to call from contract approval flows — any failure here must NOT
   * propagate to the caller (wrap in try/catch).
   */
  async scheduleDatasetPurgeForContract(contractId: string, source: string): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        listing: {
          include: {
            dataset: {
              select: {
                id: true,
                storageState: true,
                storagePurgeEligibleAt: true,
              },
            },
          },
        },
      },
    });

    if (!contract) {
      logger.warn(`[StorageLifecycle] scheduleDatasetPurgeForContract: contract ${contractId} not found`);
      return;
    }

    if (contract.status !== ContractStatus.approved) {
      logger.warn(`[StorageLifecycle] scheduleDatasetPurgeForContract: contract ${contractId} is not approved (status: ${contract.status}), skipping`);
      return;
    }

    if (!contract.approvedAt) {
      logger.warn(`[StorageLifecycle] scheduleDatasetPurgeForContract: contract ${contractId} has no approvedAt timestamp, skipping`);
      return;
    }

    const dataset = contract.listing?.dataset;
    if (!dataset) {
      logger.warn(`[StorageLifecycle] scheduleDatasetPurgeForContract: contract ${contractId} has no linked dataset, skipping`);
      return;
    }

    const eligibleAt = addDays(contract.approvedAt, RETENTION_DAYS);
    const reason = `Approved contract ${contractId}`;

    await this.scheduleDatasetPurge(dataset.id, eligibleAt, reason, source);
  }

  /**
   * Schedule object storage cleanup for a specific dataset.
   *
   * Rules:
   * - Never overwrites a dataset that is already purged.
   * - If already purge_scheduled with an earlier or equal eligibleAt, keeps existing.
   */
  async scheduleDatasetPurge(
    datasetId: string,
    eligibleAt: Date,
    reason: string,
    source: string,
  ): Promise<void> {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: { id: true, storageState: true, storagePurgeEligibleAt: true },
    });

    if (!dataset) {
      logger.warn(`[StorageLifecycle] scheduleDatasetPurge: dataset ${datasetId} not found`);
      return;
    }

    // Never touch a dataset that is already fully purged
    if (dataset.storageState === StorageState.purged) {
      logger.info(`[StorageLifecycle] Dataset ${datasetId} is already purged; skipping schedule`);
      return;
    }

    // If already scheduled with an earlier or same eligibleAt, keep it
    if (
      dataset.storageState === StorageState.purge_scheduled &&
      dataset.storagePurgeEligibleAt !== null &&
      dataset.storagePurgeEligibleAt <= eligibleAt
    ) {
      logger.info(`[StorageLifecycle] Dataset ${datasetId} already has an earlier/equal schedule; skipping`);
      return;
    }

    const now = new Date();

    await prisma.dataset.update({
      where: { id: datasetId },
      data: {
        storageState: StorageState.purge_scheduled,
        storagePurgeEligibleAt: eligibleAt,
        storagePurgeScheduledAt: now,
        storagePurgeReason: reason,
        storagePurgeError: null,
      },
    });

    try {
      // Enqueue delayed job (smart deduplication is handled inside addStoragePurgeJob)
      await addStoragePurgeJob(datasetId, eligibleAt);

      logger.info(
        `[StorageLifecycle] Dataset ${datasetId} scheduled for purge at ${eligibleAt.toISOString()} (source: ${source})`
      );

      try {
        await auditService.logAction(null, 'storage.purge_scheduled', 'dataset', datasetId, {
          source,
          eligibleAt: eligibleAt.toISOString(),
          reason,
        });
      } catch (auditErr) {
        logger.warn(`[StorageLifecycle] Audit log failed for storage.purge_scheduled (dataset ${datasetId}):`, auditErr);
      }
    } finally {
      await invalidateApiCache('/api/v1/datasets').catch((cacheErr) => {
        logger.warn(`[StorageLifecycle] Cache invalidation failed after purge schedule for dataset ${datasetId}:`, cacheErr);
      });
    }
  }

  /**
   * Safety gate — returns whether a dataset is safe to purge right now.
   *
   * Returns false (with reason) if:
   *  - Dataset does not exist
   *  - Already purged
   *  - Purge is not yet eligible (clock not reached)
   *  - An active/open Listing exists for this dataset
   *  - An active Contract exists (pending_payment/active/overdue/submitted/revision_requested/disputed)
   *  - An unexpired TaskLease exists for tasks in this dataset
   *  - A pending/processing Submission exists connected to this dataset
   */
  async canPurgeDatasetStorage(datasetId: string): Promise<{ allowed: boolean; reason?: string }> {
    const dataset = await prisma.dataset.findUnique({
      where: { id: datasetId },
      select: {
        id: true,
        storageState: true,
        storagePurgeEligibleAt: true,
      },
    });

    if (!dataset) {
      return { allowed: false, reason: 'Dataset not found' };
    }

    if (dataset.storageState === StorageState.purged) {
      return { allowed: false, reason: 'Dataset is already purged' };
    }

    if (!dataset.storagePurgeEligibleAt) {
      return { allowed: false, reason: 'storagePurgeEligibleAt is not set' };
    }

    const now = new Date();
    if (dataset.storagePurgeEligibleAt > now) {
      return {
        allowed: false,
        reason: `Purge not yet eligible (eligible at ${dataset.storagePurgeEligibleAt.toISOString()})`,
      };
    }

    // Active listings guard
    const activeListing = await prisma.listing.findFirst({
      where: {
        datasetId,
        status: { in: ['open', 'payment_pending', 'in_progress'] },
      },
      select: { id: true },
    });
    if (activeListing) {
      return { allowed: false, reason: `Active listing exists: ${activeListing.id}` };
    }

    // Active contracts guard (through listing → dataset)
    const activeContract = await prisma.contract.findFirst({
      where: {
        listing: { datasetId },
        status: {
          in: ['pending_payment', 'active', 'overdue', 'submitted', 'revision_requested', 'disputed'],
        },
      },
      select: { id: true },
    });
    if (activeContract) {
      return { allowed: false, reason: `Active contract exists: ${activeContract.id}` };
    }

    // Non-expired task leases guard (tasks whose asset belongs to this dataset)
    const activeLease = await prisma.taskLease.findFirst({
      where: {
        leasedUntil: { gt: now },
        task: {
          asset: { datasetId },
        },
      },
      select: { taskId: true },
    });
    if (activeLease) {
      return { allowed: false, reason: `Non-expired task lease exists for task ${activeLease.taskId}` };
    }

    // Pending/processing submissions guard
    const activeSubmission = await prisma.submission.findFirst({
      where: {
        status: { in: ['pending', 'processing'] },
        contract: {
          listing: { datasetId },
        },
      },
      select: { id: true },
    });
    if (activeSubmission) {
      return { allowed: false, reason: `Pending/processing submission exists: ${activeSubmission.id}` };
    }

    return { allowed: true };
  }

  /**
   * Execute the full purge of all asset objects for a dataset.
   *
   * Re-checks canPurgeDatasetStorage immediately before deleting.
   * Sets storageState to `purging` before deleting.
   * Updates each Asset's storageState individually.
   * Sets Dataset.storageState to `purged` only when ALL assets succeed.
   *
   * Returns:
   *   'skipped'  — safety gate blocked the purge
   *   'purged'   — all asset objects deleted successfully
   *   'failed'   — one or more asset object deletions failed
   */
  async purgeDatasetStorage(datasetId: string, source: string): Promise<'purged' | 'failed' | 'skipped'> {
    logger.info(`[StorageLifecycle] Starting purge for dataset ${datasetId} (source: ${source})`);

    // Re-check safety gate
    const { allowed, reason } = await this.canPurgeDatasetStorage(datasetId);
    if (!allowed) {
      logger.info(`[StorageLifecycle] Purge blocked for dataset ${datasetId}: ${reason}`);
      return 'skipped';
    }

    // Mark dataset as purging (retain existing storageState fields)
    await prisma.dataset.update({
      where: { id: datasetId },
      data: { storageState: StorageState.purging },
    });

    try {
      await auditService.logAction(null, 'storage.purge_started', 'dataset', datasetId, {
        source,
      });
    } catch (auditErr) {
      logger.warn(`[StorageLifecycle] Audit log failed for storage.purge_started (dataset ${datasetId}):`, auditErr);
    }

    // Fetch all assets that are not already purged
    const assets = await prisma.asset.findMany({
      where: {
        datasetId,
        storageState: { not: StorageState.purged },
      },
      select: { id: true, objectKey: true },
    });

    const now = new Date();
    let failedCount = 0;
    const failedAssetIds: string[] = [];

    for (const asset of assets) {
      try {
        await deleteFromR2Safe(asset.objectKey);

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            storageState: StorageState.purged,
            objectDeletedAt: now,
            objectDeleteError: null,
          },
        });
      } catch (err: any) {
        const errorMsg = err?.message ?? String(err);
        logger.error(`[StorageLifecycle] Failed to delete object ${asset.objectKey} (asset ${asset.id}):`, err);

        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            storageState: StorageState.purge_failed,
            objectDeleteError: errorMsg.slice(0, 500), // keep it concise
          },
        });

        failedCount++;
        failedAssetIds.push(asset.id);
      }
    }

    // Determine final Dataset state
    if (failedCount === 0) {
      await prisma.dataset.update({
        where: { id: datasetId },
        data: {
          storageState: StorageState.purged,
          storagePurgedAt: now,
          storagePurgeError: null,
        },
      });

      logger.info(`[StorageLifecycle] Dataset ${datasetId} purge completed (${assets.length} assets)`);

      try {
        await auditService.logAction(null, 'storage.purge_completed', 'dataset', datasetId, {
          source,
          assetCount: assets.length,
        });
      } catch (auditErr) {
        logger.warn(`[StorageLifecycle] Audit log failed for storage.purge_completed (dataset ${datasetId}):`, auditErr);
      }
    } else {
      const errorSummary = `${failedCount}/${assets.length} object(s) failed to delete. Failed asset IDs: ${failedAssetIds.slice(0, 10).join(', ')}${failedAssetIds.length > 10 ? '…' : ''}`;

      await prisma.dataset.update({
        where: { id: datasetId },
        data: {
          storageState: StorageState.purge_failed,
          storagePurgeError: errorSummary,
        },
      });

      logger.error(`[StorageLifecycle] Dataset ${datasetId} purge partially failed: ${errorSummary}`);

      try {
        await auditService.logAction(null, 'storage.purge_failed', 'dataset', datasetId, {
          source,
          errorSummary,
          failedCount,
          totalCount: assets.length,
        });
      } catch (auditErr) {
        logger.warn(`[StorageLifecycle] Audit log failed for storage.purge_failed (dataset ${datasetId}):`, auditErr);
      }
    }

    // Invalidate dataset cache so clients see updated storageState.
    // Asset routes do not use cacheMiddleware, so no asset cache invalidation needed.
    try {
      await invalidateApiCache('/api/v1/datasets');
    } catch (cacheErr) {
      logger.warn(`[StorageLifecycle] Cache invalidation failed for dataset ${datasetId}:`, cacheErr);
    }

    return failedCount === 0 ? 'purged' : 'failed';
  }

  /**
   * Scan for datasets that are due for purge and execute them.
   *
   * Picks up:
   *   - purge_scheduled and purge_failed datasets whose storagePurgeEligibleAt <= now
   *     (covers cases where the delayed BullMQ job was missed or storage transiently failed)
   *   - purging datasets whose updatedAt is older than STALE_PURGING_MS
   *     (covers worker crash after setting state=purging before completing deletion)
   *
   * Returns a summary of the scan results.
   */
  async processDueDatasetPurges(): Promise<{
    scanned: number;
    purged: number;
    skipped: number;
    failed: number;
  }> {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_PURGING_MS);

    const dueSets = await prisma.dataset.findMany({
      where: {
        OR: [
          // Normal recovery: scheduled/failed and retention window passed
          {
            storageState: { in: [StorageState.purge_scheduled, StorageState.purge_failed] },
            storagePurgeEligibleAt: { lte: now },
          },
          // Stale purging recovery: stuck in purging for longer than STALE_PURGING_MS
          {
            storageState: StorageState.purging,
            updatedAt: { lte: staleThreshold },
            storagePurgeEligibleAt: { lte: now },
          },
        ],
      },
      select: { id: true },
      take: BATCH_SIZE,
    });

    const summary = { scanned: dueSets.length, purged: 0, skipped: 0, failed: 0 };

    for (const dataset of dueSets) {
      try {
        const result = await this.purgeDatasetStorage(dataset.id, 'storage_cleanup_worker_scan');
        if (result === 'purged') {
          summary.purged++;
        } else if (result === 'failed') {
          summary.failed++;
        } else {
          // result === 'skipped'
          summary.skipped++;
        }
      } catch (err) {
        logger.error(`[StorageLifecycle] Scan failed for dataset ${dataset.id}:`, err);
        summary.failed++;
      }
    }

    logger.info(`[StorageLifecycle] Scan completed: ${JSON.stringify(summary)}`);
    return summary;
  }
}

export const storageLifecycleService = new StorageLifecycleService();
