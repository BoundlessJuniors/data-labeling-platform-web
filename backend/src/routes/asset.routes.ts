import { Router } from 'express';
import * as assetController from '../controllers/asset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateAssetSchema, idParamSchema, initiateUploadSchema } from '../validators/validation.schemas';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

// GET /api/assets - Get all assets
router.get(
  '/',
  authenticate,
  cacheMiddleware({ ttl: 60, keyPrefix: 'cache' }),
  assetController.getAssets,
);

// POST /api/assets/initiate - Initiate upload (get URL)
router.post(
  '/initiate',
  authenticate,
  validate(initiateUploadSchema),
  assetController.initiateUpload,
);

// POST /api/assets/:id/confirm - Confirm upload and queue processing
router.post(
  '/:id/confirm',
  authenticate,
  validate(idParamSchema, 'params'),
  assetController.completeUpload,
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
