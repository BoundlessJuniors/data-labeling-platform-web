/**
 * BullMQ worker configuration helpers.
 *
 * Centralises drainDelay / stalledInterval / concurrency values so that
 * every worker reads from the same env variables with consistent defaults.
 *
 * Purpose:
 *   - drainDelay  → how many seconds a worker long-polls before checking
 *                   for new jobs again when the queue is empty.
 *                   Higher value = fewer Redis commands when idle.
 *   - stalledInterval → how often (ms) workers check for stalled jobs.
 *                       Higher value = fewer Redis commands at rest.
 *
 * Recommended beta/demo .env overrides (reduce Upstash Free Tier usage):
 *   BULLMQ_DRAIN_DELAY_SECONDS=300
 *   BULLMQ_STALLED_INTERVAL_MS=300000
 *   ASSET_WORKER_CONCURRENCY=1
 *   NORMALIZE_WORKER_CONCURRENCY=1
 */

const DEFAULT_DRAIN_DELAY_SECONDS = 300;
const DEFAULT_STALLED_INTERVAL_MS = 300_000;
const DEFAULT_ASSET_CONCURRENCY = 1;
const DEFAULT_NORMALIZE_CONCURRENCY = 1;

/**
 * Parses an env string to a positive integer.
 * Returns `fallback` if the value is absent, non-numeric, NaN, ≤ 0, or not finite.
 */
export function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/**
 * Returns the drainDelay in *seconds* for BullMQ WorkerOptions.
 * BullMQ's drainDelay option is expressed in seconds.
 */
export function getBullMqDrainDelaySeconds(): number {
  return parsePositiveInt(
    process.env.BULLMQ_DRAIN_DELAY_SECONDS,
    DEFAULT_DRAIN_DELAY_SECONDS,
  );
}

/**
 * Returns the stalledInterval in *milliseconds* for BullMQ WorkerOptions.
 */
export function getBullMqStalledIntervalMs(): number {
  return parsePositiveInt(
    process.env.BULLMQ_STALLED_INTERVAL_MS,
    DEFAULT_STALLED_INTERVAL_MS,
  );
}

/**
 * Returns the concurrency for the asset-processing worker.
 */
export function getAssetWorkerConcurrency(): number {
  return parsePositiveInt(
    process.env.ASSET_WORKER_CONCURRENCY,
    DEFAULT_ASSET_CONCURRENCY,
  );
}

/**
 * Returns the concurrency for the normalize-processing worker.
 */
export function getNormalizeWorkerConcurrency(): number {
  return parsePositiveInt(
    process.env.NORMALIZE_WORKER_CONCURRENCY,
    DEFAULT_NORMALIZE_CONCURRENCY,
  );
}
