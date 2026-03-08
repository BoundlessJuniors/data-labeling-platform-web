import { Worker, Job } from 'bullmq';
import prisma from '../lib/db';
import { redisConfig } from '../lib/redis';
import logger from '../lib/logger';
import { normalizeRawPayload } from '../utils/normalize.util';
import { Prisma } from '@prisma/client';
import pLimit from 'p-limit';

const WORKER_NAME = 'normalize-processing';
const UPSERT_CONCURRENCY = 10; // Max parallel upserts per job

interface NormalizeJobData {
  contractId: string;
  submissionId: string;
}

/**
 * Row returned by the DISTINCT ON query.
 */
interface LatestRawRow {
  taskId: string;
  payloadJson: Prisma.JsonValue;
}

export function startNormalizeWorker() {
  const worker = new Worker(
    WORKER_NAME,
    async (job: Job<NormalizeJobData>) => {
      const { contractId, submissionId } = job.data;
      logger.info(`[NormalizeWorker] Processing job ${job.id} for contract ${contractId}`);

      try {
        // 1. Mark submission as 'processing' (single source of truth for this transition)
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: 'processing' },
        });

        // 2. Fetch contract to get labelerUserId
        const contract = await prisma.contract.findUnique({
          where: { id: contractId },
          select: { id: true, labelerUserId: true },
        });

        if (!contract) {
          throw new Error(`Contract ${contractId} not found`);
        }

        // 3. Get total task count for reporting
        const totalTasks = await prisma.task.count({
          where: { contractId },
        });

        if (totalTasks === 0) {
          logger.warn(`[NormalizeWorker] No tasks found for contract ${contractId}`);
          await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'completed', errorMessage: null },
          });
          return;
        }

        // 4. Fetch latest raw annotation per task using DISTINCT ON.
        //
        //    FULL SNAPSHOT SEMANTICS:
        //      Each raw annotation row is a complete task annotation snapshot,
        //      not a partial patch. We take the LATEST valid row per task.
        //
        //    ADMIN DEBUG EXCLUSION:
        //      lease_token IS NOT NULL excludes admin debug rows
        //      (POST /annotations/raw creates rows without leaseToken).
        //      Only real labeler submissions (POST /tasks/:id/submit) are
        //      considered for normalization.
        //
        //    Tie-break on id DESC for deterministic selection when timestamps match.
        //    Returns exactly 1 row per task → O(tasks), not O(raw_history).
        const latestRaws: LatestRawRow[] = await prisma.$queryRaw`
          SELECT DISTINCT ON (ar.task_id)
            ar.task_id AS "taskId",
            ar.payload_json AS "payloadJson"
          FROM annotations_raw ar
          JOIN tasks t ON t.id = ar.task_id
          WHERE t.contract_id = ${contractId}::uuid
            AND ar.lease_token IS NOT NULL
          ORDER BY ar.task_id, ar.created_at DESC, ar.id DESC
        `;

        // 5. Normalize + upsert with controlled concurrency (p-limit)
        const limit = pLimit(UPSERT_CONCURRENCY);

        const upsertPromises = latestRaws.map((row) =>
          limit(async () => {
            const normalizedJson = normalizeRawPayload(row.payloadJson);

            await prisma.annotationNormalized.upsert({
              where: { taskId: row.taskId },
              create: {
                taskId: row.taskId,
                labelerUserId: contract.labelerUserId,
                normalizedJson: normalizedJson as Prisma.InputJsonValue,
                version: 1,
              },
              update: {
                normalizedJson: normalizedJson as Prisma.InputJsonValue,
                version: { increment: 1 },
              },
            });
          })
        );

        await Promise.all(upsertPromises);

        const normalizedCount = latestRaws.length;

        const skippedCount = totalTasks - normalizedCount;

        // 6. Mark submission as completed
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: 'completed', errorMessage: null },
        });

        logger.info(
          `[NormalizeWorker] Contract ${contractId}: normalized ${normalizedCount} tasks, skipped ${skippedCount} (no valid raw annotation)`
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[NormalizeWorker] Job failed for contract ${contractId}:`, error);

        // Mark submission as failed
        try {
          await prisma.submission.update({
            where: { id: submissionId },
            data: { status: 'failed', errorMessage },
          });
        } catch (updateErr) {
          logger.error('[NormalizeWorker] Failed to update submission status:', updateErr);
        }

        throw error; // Let BullMQ handle retry
      }
    },
    {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
      },
      concurrency: 2, // Low concurrency to avoid DB pressure
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[NormalizeWorker] Job ${job.id} completed!`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[NormalizeWorker] Job ${job?.id} failed with ${err.message}`);
  });

  logger.info(`🚀 Worker "${WORKER_NAME}" started`);
  return worker;
}
