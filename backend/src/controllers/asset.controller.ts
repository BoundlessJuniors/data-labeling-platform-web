import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AssetService } from '../services/asset.service';
import { BadRequestError } from '../utils/errors';

const assetService = new AssetService();

// Create a new asset (multipart upload)
export const createAsset = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    const { datasetId } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!file) {
      throw new BadRequestError('Dosya yüklenmedi. Lütfen bir resim dosyası seçin.');
    }

    const asset = await assetService.createAsset(userId, userRole, datasetId, file);

    res.status(201).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    next(error);
  }
};

// Create multiple assets at once (bulk upload)
export const createAssetBulk = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const { datasetId } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const createdAssets = await assetService.createAssetBulk(userId, userRole, datasetId, files);

    res.status(201).json({
      success: true,
      data: createdAssets,
      count: createdAssets.length,
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
