import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AssetService } from '../services/asset.service';
import { BadRequestError } from '../utils/errors';
import { getBetaLimits } from '../config/beta-limits';
import { isAllowedImageMimeType, ALLOWED_MIME_TYPES } from '../config/upload-security';

const assetService = new AssetService();

export const initiateUpload = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { datasetId, filename, contentType, fileSize } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!filename || !contentType || !fileSize) {
      throw new BadRequestError('Filename, Content-Type ve File Size zorunludur.');
    }

    // Security Check: MIME Type (centralized allowlist)
    if (!isAllowedImageMimeType(contentType)) {
      throw new BadRequestError(
        `Desteklenmeyen dosya formatı. İzin verilen formatlar: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Security Check: File Size from Beta Limits
    const { maxFileSizeBytes } = getBetaLimits();
    if (fileSize > maxFileSizeBytes) {
      const maxMb = (maxFileSizeBytes / (1024 * 1024)).toFixed(1);
      throw new BadRequestError(`Dosya boyutu ${maxMb} MB'ı geçemez.`);
    }

    const result = await assetService.initiateUpload(
      userId, 
      userRole, 
      datasetId, 
      filename, 
      contentType,
      fileSize
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Complete upload (Confirm and Queue)
export const completeUpload = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await assetService.completeUpload(userId, userRole, id);

    res.json({
      success: true,
      message: 'Upload confirmed, processing started.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get all assets (with pagination and filtering)
export const getAssets = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const datasetId = req.query.datasetId as string | undefined;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const result = await assetService.getAssets(page, limit, userId, userRole, datasetId);

    res.json({
      success: true,
      data: result.assets,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single asset by ID
export const getAssetById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const asset = await assetService.getAssetById(id, userId, userRole);

    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// Update an asset
export const updateAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { objectKey, mimeType, width, height, sizeBytes, checksum } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedAsset = await assetService.updateAsset(id, userId, userRole, {
      objectKey,
      mimeType,
      width,
      height,
      sizeBytes,
      checksum,
    });

    res.json({
      success: true,
      data: updatedAsset,
    });
  } catch (error) {
    next(error);
  }
};

// Delete an asset
export const deleteAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await assetService.deleteAsset(id, userId, userRole);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
