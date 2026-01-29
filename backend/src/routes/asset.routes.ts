import { Router } from 'express';
import * as assetController from '../controllers/asset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAssetSchema, updateAssetSchema, idParamSchema } from '../validators/validation.schemas';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

// GET /api/assets - Get all assets
router.get(
  '/',
  authenticate,
  cacheMiddleware({ ttl: 60, keyPrefix: 'cache' }),
  assetController.getAssets
);

// POST /api/assets - Create a new asset
router.post(
  '/',
  authenticate,
  validate(createAssetSchema),
  assetController.createAsset
);

// GET /api/assets/:id - Get a single asset
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  cacheMiddleware({ ttl: 120, keyPrefix: 'cache' }),
  assetController.getAssetById
);

// PUT /api/assets/:id - Update an asset
router.put(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(updateAssetSchema),
  assetController.updateAsset
);

// DELETE /api/assets/:id - Delete an asset
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  assetController.deleteAsset
);

export default router;
