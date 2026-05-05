# Storage Lifecycle Policy

> **Backend-only feature.** This document covers the server-side object storage lifecycle for the Data Labeling Platform.

---

## Principle: Metadata is never deleted

The lifecycle cleanup **only removes physical source image objects** from S3-compatible storage (MinIO in development, Cloudflare R2 in production).

The following database records are **always retained**:

| Table | Retained |
|---|---|
| `datasets` | ✅ |
| `assets` | ✅ |
| `tasks` | ✅ |
| `annotations_raw` | ✅ |
| `annotations_normalized` | ✅ |
| `contracts` | ✅ |
| `payments` | ✅ |
| `escrow_ledger` | ✅ |
| `submissions` | ✅ |
| `audit_logs` | ✅ |

---

## Storage States

Both `Dataset` and `Asset` models carry a `storageState` field (`StorageState` enum).

| Value | Meaning |
|---|---|
| `active` | Default; object exists in storage |
| `purge_scheduled` | Cleanup enqueued; objects still present |
| `purging` | Deletion in progress |
| `purged` | All objects deleted; DB metadata intact |
| `purge_failed` | ≥1 object deletion failed; eligible for retry |

`storageState` transitions **never modify** `Dataset.status` or `Asset.status`. Those fields track the labeling workflow, not storage.

---

## Retention window

When a contract reaches the **`approved`** state, the system schedules object storage cleanup for the linked dataset after:

```
eligibleAt = contract.approvedAt + STORAGE_RETENTION_DAYS
```

`STORAGE_RETENTION_DAYS` defaults to **7 days** and is configurable via environment variable.

---

## Trigger paths

| Path | Source tag | Notes |
|---|---|---|
| Client manually approves | `contract_approve` | `ContractService.approveContract` |
| Admin releases after dispute | `admin_dispute_release` | `ContractService.resolveDispute` (release_to_labeler only) |
| Review window auto-approval | `deadline_auto_approve` | `DeadlineService.autoApproveSubmittedContracts` |

### Paths that do NOT trigger purge

- Contract cancelled (`cancelled` state)
- Contract refunded (`refunded` state) — the listing is reopened and the dataset may be reused
- Disputed contracts whose admin decision is `refund_client`

---

## Safety gate (canPurgeDatasetStorage)

Before any object is deleted, the following checks are performed:

1. Dataset must exist and not already be `purged`
2. `storagePurgeEligibleAt` must be ≤ now
3. No Listing with status `open | payment_pending | in_progress`
4. No Contract (via Listing → Dataset) with status `pending_payment | active | overdue | submitted | revision_requested | disputed`
5. No non-expired `TaskLease` for tasks belonging to this dataset
6. No `Submission` with status `pending | processing`

---

## Worker & reconciliation scan

### BullMQ worker

- Queue name: `storage-cleanup`
- Concurrency: **1** (avoids concurrent purge state conflicts)
- Job types:
  - `purge-dataset-storage` — purges a single dataset's objects
  - `scan-storage-cleanup` — reconciliation scan

### Delayed job

When a purge is scheduled, a BullMQ delayed job (`storage-purge:<datasetId>`) is enqueued with `delay = eligibleAt - now`.

If the job ID already exists:
- If the new `runAt` is **earlier** than the existing delay → old job replaced
- Otherwise → existing job is kept

### Reconciliation scan

A **repeated job** (`scan-storage-cleanup`) runs every `STORAGE_CLEANUP_SCAN_INTERVAL_MS` (default: 1 hour).

The scan queries for datasets where:
- `storageState IN (purge_scheduled, purge_failed)` AND `storagePurgeEligibleAt <= now`
- OR `storageState = purging` AND `updatedAt <= now - STORAGE_PURGING_STALE_AFTER_MS` (Stale Purging Recovery)

This recovers datasets missed by a failed/lost delayed job, retries datasets in `purge_failed` state after transient storage errors, and recovers datasets stuck in `purging` state due to worker crashes.

---

## Workflow Guards

To ensure production safety, the system prevents non-active storage datasets from entering new labeling workflows:

- **Listing Creation**: `ListingService.createListing` blocks any dataset where `storageState !== active`.
- **Proposal Acceptance**: `ProposalService.acceptProposal` re-checks the dataset `storageState`. If not `active`, the acceptance is blocked.
- **Task Creation**: During proposal acceptance, the system verifies that ALL assets in the dataset are `active`. If any asset is purged or purging, task creation is aborted (atomically within the transaction).

---

## API behaviour after purge

### Signed URLs

- **Purged assets** → `signedUrl: null` (no `getSignedUrl` call is made)
- **QC sample images** → `imageUrl: null` for purged assets
- **Task QC view** → `imageUrl: null` for purged assets

### Export

Annotation metadata export (COCO/YOLO/VOC) **continues to work** after purge because it reads `AnnotationNormalized` records, which are always retained. The source image files are unavailable for preview/download.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `STORAGE_RETENTION_DAYS` | `7` | Days after `approvedAt` before purge is eligible |
| `STORAGE_CLEANUP_SCAN_INTERVAL_MS` | `3600000` | Repeated scan interval in ms (1 hour) |
| `STORAGE_CLEANUP_BATCH_SIZE` | `50` | Max datasets processed per reconciliation scan |
| `STORAGE_PURGING_STALE_AFTER_MS` | `21600000` | MS after which a `purging` dataset is considered stale (6 hours) |

---

## Audit events

All lifecycle events are written to `audit_logs` with `actorUserId = null` (system events). The frontend renders these as "System / Background Worker".

| Action | Trigger |
|---|---|
| `storage.purge_scheduled` | Dataset purge scheduled |
| `storage.purge_started` | Purge execution begins |
| `storage.purge_completed` | All objects successfully deleted |
| `storage.purge_failed` | ≥1 object deletion failed |
