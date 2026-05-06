import { Prisma, StorageState, UserRole } from "@prisma/client";
import path from "path";
import { randomUUID } from "crypto";
import prisma from "../lib/db";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../utils/errors";
import { cacheDelete, cacheDeletePattern } from "../lib/redis";
import {
  uploadToR2,
  getSignedUrl,
  deleteFromR2Safe,
  getPresignedPutUrl,
} from "../lib/storage";
import { addAssetJob } from "../lib/queue";
import logger from "../lib/logger";
import { getBetaLimits } from '../config/beta-limits';

// Interface for Multer file (since we don't import 'express' here)
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class AssetService {
  /**
   * Helper: Attach a signed URL to a single asset record.
   * Returns signedUrl: null if the asset's object has been purged from storage.
   * The asset's storageState field must be included in the query that fetches the asset.
   */
  private async attachSignedUrl<T extends { objectKey: string; storageState: StorageState }>(
    asset: T,
  ): Promise<T & { signedUrl: string | null }> {
    if (asset.storageState === StorageState.purged) {
      return { ...asset, signedUrl: null };
    }
    const signedUrl = await getSignedUrl(asset.objectKey);
    return { ...asset, signedUrl };
  }

  /**
   * Helper: Attach signed URLs to a list of asset records.
   * Purged assets receive signedUrl: null.
   */
  private async attachSignedUrls<T extends { objectKey: string; storageState: StorageState }>(
    assets: T[],
  ): Promise<(T & { signedUrl: string | null })[]> {
    return Promise.all(assets.map((a) => this.attachSignedUrl(a)));
  }

  /**
   * Initiate a single file upload (Direct to R2)
   * Returns a Presigned PUT URL and creates a pending Asset record.
   */
  async initiateUpload(
    userId: string,
    userRole: UserRole,
    datasetId: string,
    filename: string,
    contentType: string,
    fileSize: number
  ) {
    if (!datasetId) {
      throw new BadRequestError("Dataset ID zorunludur.");
    }

    const { datasetMaxAssets, userMaxStorageBytes } = getBetaLimits();

    const asset = await prisma.$transaction(async (tx) => {
      // 1. Dataset satırını PostgreSQL row lock ile kilitle (non-admin için)
      // 2. User satırını kilitle
      // This prevents concurrent initiateUpload requests from bypassing beta dataset asset count and user storage quota.
      if (userRole !== "admin") {
        await tx.$queryRaw`SELECT id FROM "datasets" WHERE id = ${datasetId}::uuid FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId}::uuid FOR UPDATE`;
      }

      const dataset = await tx.dataset.findUnique({
        where: { id: datasetId },
        include: { _count: { select: { listings: true } } },
      });

      if (!dataset) {
        throw new NotFoundError("Dataset");
      }

      if (userRole !== "admin" && dataset.ownerUserId !== userId) {
        throw new ForbiddenError("Bu datasete asset ekleme yetkiniz yok.");
      }

      if (dataset._count.listings > 0) {
        throw new BadRequestError(
          "Bu dataset bir ilanda kullanıldığı için yeni görsel yüklenemez.",
        );
      }

      if (userRole !== "admin") {
        // 1. Enforce Dataset Asset Limit
        // Purged assets are excluded so that rejected/oversized uploads do not permanently block the user.
        const currentAssetCount = await tx.asset.count({
          where: {
            datasetId,
            storageState: { not: StorageState.purged },
          },
        });

        if (currentAssetCount >= datasetMaxAssets) {
          throw new BadRequestError(`Beta: Bir dataset en fazla ${datasetMaxAssets} görsel içerebilir.`);
        }

        // 2. Enforce User Storage Limit
        const storageAgg = await tx.asset.aggregate({
          _sum: { sizeBytes: true },
          where: {
            dataset: { ownerUserId: userId },
            storageState: { not: StorageState.purged }
          }
        });

        const currentStorageUsed = Number(storageAgg._sum.sizeBytes || 0);
        if (currentStorageUsed + fileSize > userMaxStorageBytes) {
          const maxMb = (userMaxStorageBytes / (1024 * 1024)).toFixed(1);
          throw new BadRequestError(`Beta: Toplam depolama alanınız ${maxMb} MB sınırını aşıyor.`);
        }
      }

      // Build a unique object key
      const ext = path.extname(filename) || "";
      const objectKey = `assets/${datasetId}/${randomUUID()}${ext}`;

      // Create pending asset record
      return await tx.asset.create({
        data: {
          datasetId,
          objectKey,
          mimeType: contentType,
          status: "pending",
          sizeBytes: fileSize,
        },
      });
    });

    // Generate Presigned PUT URL
    const signedUrl = await getPresignedPutUrl(asset.objectKey, contentType);

    return {
      signedUrl,
      assetId: asset.id,
      objectKey: asset.objectKey,
    };
  }

  /**
   * Complete an upload
   * Verifies the asset exists and triggers the processing job.
   * Concurrent-safe: uses updateMany WHERE status='pending' to atomically claim the transition.
   * Only the request that successfully flips status to 'uploaded' enqueues the job.
   */
  async completeUpload(userId: string, userRole: UserRole, assetId: string) {
    // Auth + existence check first (outside transaction — read-only, fast)
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: { select: { ownerUserId: true, id: true } },
      },
    });

    if (!asset) {
      throw new NotFoundError("Asset");
    }

    if (userRole !== "admin" && asset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError("Bu işlem için yetkiniz yok.");
    }

    // Guard: purged asset cannot be re-confirmed.
    if (asset.storageState === StorageState.purged) {
      throw new BadRequestError("Bu asset storage'dan silindiği için tekrar işlenemez.");
    }

    // Fast-path idempotency for already in-flight or finished assets (before the atomic update).
    // Concurrent requests will fall through to updateMany and handle the race there.
    if (
      asset.status === "uploaded" ||
      asset.status === "processing" ||
      asset.status === "ready"
    ) {
      return this.attachSignedUrl(asset);
    }

    if (asset.status === "error") {
      throw new BadRequestError(
        "Bu asset hata durumunda olduğu için tekrar onaylanamaz. Lütfen yeniden yükleyin."
      );
    }

    // Atomic pending → uploaded transition.
    // Only the request that wins the race (count === 1) enqueues the job.
    const updateResult = await prisma.asset.updateMany({
      where: {
        id: assetId,
        status: "pending",
        storageState: { not: StorageState.purged },
      },
      data: { status: "uploaded" },
    });

    if (updateResult.count === 0) {
      // Race lost or status changed between the read above and the update.
      // Re-read to figure out current state and respond idempotently.
      const latestAsset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { dataset: { select: { ownerUserId: true, id: true } } },
      });

      if (!latestAsset) throw new NotFoundError("Asset");

      if (latestAsset.storageState === StorageState.purged) {
        throw new BadRequestError("Bu asset storage'dan silindiği için tekrar işlenemez.");
      }

      if (
        latestAsset.status === "uploaded" ||
        latestAsset.status === "processing" ||
        latestAsset.status === "ready"
      ) {
        return this.attachSignedUrl(latestAsset);
      }

      if (latestAsset.status === "error") {
        throw new BadRequestError(
          "Bu asset hata durumunda olduğu için tekrar onaylanamaz. Lütfen yeniden yükleyin."
        );
      }

      throw new BadRequestError("Bu asset mevcut durumunda onaylanamaz.");
    }

    // updateResult.count === 1: this request won the race — enqueue the job.
    const updatedAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { dataset: { select: { ownerUserId: true, id: true } } },
    });

    if (!updatedAsset) throw new NotFoundError("Asset");

    await addAssetJob(updatedAsset.id, updatedAsset.objectKey);

    // Update dataset status → ready (if not already)
    if (updatedAsset.dataset) {
      await prisma.dataset.updateMany({
        where: { id: updatedAsset.datasetId, status: { in: ["draft", "uploading"] } },
        data: { status: "ready" },
      });
    }

    logger.info(`Asset upload confirmed: ${assetId} -> Queued for processing`);

    // Invalidate caches
    await cacheDeletePattern("cache:/api/v1/assets*");
    await cacheDeletePattern("cache:/api/v1/datasets*");

    return this.attachSignedUrl(updatedAsset);
  }

  /**
   * Get all assets (with pagination and filtering)
   */
  async getAssets(
    page: number,
    limit: number,
    userId: string | undefined,
    userRole: UserRole | undefined,
    datasetId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      // Exclude purged assets so that list count matches backend quota slot count.
      // Frontend limit checks (isAssetLimitReached) depend on pagination.total being accurate.
      storageState: { not: StorageState.purged },
    };

    if (datasetId) {
      where.datasetId = datasetId;
    }

    // If not admin, only show assets from owned datasets
    if (userRole !== "admin") {
      where.dataset = {
        ownerUserId: userId,
      };
    }

    const [rawAssets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          dataset: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    // Attach signed URLs (purged assets get signedUrl: null)
    const assets = await this.attachSignedUrls(rawAssets);

    return {
      assets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single asset by ID.
   * Purged assets are still returned (metadata is always preserved);
   * signedUrl will be null for purged assets.
   */
  async getAssetById(
    assetId: string,
    userId: string | undefined,
    userRole: UserRole | undefined,
  ) {
    const rawAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: {
          select: { id: true, name: true, ownerUserId: true },
        },
      },
    });

    if (!rawAsset) {
      throw new NotFoundError("Asset");
    }

    // Check access rights (Yetki Kontrolü)
    let hasAccess = false;

    if (userRole === "admin") {
      hasAccess = true; // Admin her şeyi görebilir
    } else if (rawAsset.dataset.ownerUserId === userId) {
      hasAccess = true; // Müşteri kendi yüklediği resmi görebilir
    } else if (userRole === "labeler" && userId) {
      // Labeler (Etiketleyici) sadece üzerine atanmış sözleşmedeki resimleri görebilir
      const hasTask = await prisma.task.findFirst({
        where: {
          assetId: assetId,
          contract: {
            labelerUserId: userId,
          },
        },
      });

      if (hasTask) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new ForbiddenError("Bu asete erişim yetkiniz yok.");
    }

    // Return metadata for purged assets with signedUrl: null
    return this.attachSignedUrl(rawAsset);
  }

  /**
   * Update an asset
   */
  async updateAsset(
    assetId: string,
    userId: string,
    userRole: UserRole,
    data: {
      objectKey?: string;
      mimeType?: string;
      width?: number;
      height?: number;
      sizeBytes?: number;
      checksum?: string;
    },
  ) {
    // Check if asset exists and user has access
    const existingAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: {
          select: { ownerUserId: true },
        },
      },
    });

    if (!existingAsset) {
      throw new NotFoundError("Asset");
    }

    if (userRole !== "admin" && existingAsset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError("Bu aseti güncelleme yetkiniz yok.");
    }

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(data.objectKey && { objectKey: data.objectKey }),
        ...(data.mimeType && { mimeType: data.mimeType }),
        ...(data.width !== undefined && { width: data.width }),
        ...(data.height !== undefined && { height: data.height }),
        ...(data.sizeBytes !== undefined && { sizeBytes: data.sizeBytes }),
        ...(data.checksum !== undefined && { checksum: data.checksum }),
      },
      include: {
        dataset: {
          select: { id: true, name: true },
        },
      },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/v1/assets/${assetId}`);

    logger.info(`Asset updated: ${asset.id}`);

    return this.attachSignedUrl(asset);
  }

  /**
   * Delete an asset (only for datasets not linked to any listing).
   * - If the asset's object has already been purged from storage, skips R2 deletion.
   * - If the object is missing in storage (404/NoSuchKey), tolerates it.
   */
  async deleteAsset(assetId: string, userId: string, userRole: UserRole) {
    // Check if asset exists and user has access
    const existingAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        dataset: {
          select: { ownerUserId: true, _count: { select: { listings: true } } },
        },
      },
    });

    if (!existingAsset) {
      throw new NotFoundError("Asset");
    }

    if (userRole !== "admin" && existingAsset.dataset.ownerUserId !== userId) {
      throw new ForbiddenError("Bu aseti silme yetkiniz yok.");
    }

    if (existingAsset.dataset._count.listings > 0) {
      throw new BadRequestError(
        "Bu görsel, bir ilanda kullanılan bir datasete ait olduğu için silinemez.",
      );
    }

    // Delete physical object from R2 (skipped if already purged; tolerates missing objects)
    if (existingAsset.storageState !== StorageState.purged) {
      try {
        await deleteFromR2Safe(existingAsset.objectKey);
      } catch (r2Err) {
        logger.warn(
          `Failed to delete object from R2 (key: ${existingAsset.objectKey}): ${r2Err}`,
        );
      }
    }

    await prisma.asset.delete({
      where: { id: assetId },
    });

    // Invalidate cache
    await cacheDelete(`cache:/api/v1/assets/${assetId}`);

    logger.info(`Asset deleted: ${assetId}`);
  }
}
