import { Router } from 'express';
import * as assetController from '../controllers/asset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateAssetSchema, idParamSchema, initiateUploadSchema } from '../validators/validation.schemas';

const router = Router();

// GET /api/assets - Get all assets
// NOTE: cacheMiddleware is intentionally omitted here.
// Asset responses contain signed URLs (signedUrl field) generated per-request.
// Caching these would allow stale or revoked URLs to be served during the TTL
// window, creating a potential access-control bypass after role changes,
// contract cancellations, or asset deletions.
router.get(
  '/',
  authenticate,
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
// NOTE: cacheMiddleware is intentionally omitted — see comment on GET / above.
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
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
