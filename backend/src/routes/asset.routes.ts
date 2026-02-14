import { Router } from 'express';
import * as assetController from '../controllers/asset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { upload } from '../middlewares/upload.middleware';
import { updateAssetSchema, idParamSchema } from '../validators/validation.schemas';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

// GET /api/assets - Get all assets
router.get(
  '/',
  authenticate,
  cacheMiddleware({ ttl: 60, keyPrefix: 'cache' }),
  assetController.getAssets,
);

// POST /api/assets - Upload a new asset (multipart/form-data)
router.post(
  '/',
  authenticate,
  upload.single('file'),
  assetController.createAsset,
);

// POST /api/assets/bulk - Upload multiple assets at once
router.post(
  '/bulk',
  authenticate,
  upload.array('files', 100),
  assetController.createAssetBulk,
);

// GET /api/assets/:id - Get a single asset
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  cacheMiddleware({ ttl: 120, keyPrefix: 'cache' }),
  assetController.getAssetById,
);

// PUT /api/assets/:id - Update an asset
router.put(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(updateAssetSchema),
  assetController.updateAsset,
);

// DELETE /api/assets/:id - Delete an asset
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  assetController.deleteAsset,
);

export default router;
