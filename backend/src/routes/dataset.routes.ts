import { Router } from 'express';
import * as datasetController from '../controllers/dataset.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import { adminOrClient } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createDatasetSchema, updateDatasetSchema, idParamSchema } from '../validators/validation.schemas';
import { cacheMiddleware } from '../middlewares/cache.middleware';

const router = Router();

// GET /api/datasets - Get all datasets (uses cache)
router.get(
  '/',
  optionalAuth,
  cacheMiddleware({ ttl: 60, keyPrefix: 'cache' }),
  datasetController.getDatasets
);

// POST /api/datasets - Create a new dataset (protected, client/admin only)
router.post(
  '/',
  authenticate,
  adminOrClient,
  validate(createDatasetSchema),
  datasetController.createDataset
);

// GET /api/datasets/:id - Get a single dataset (uses cache)
router.get(
  '/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  cacheMiddleware({ ttl: 120, keyPrefix: 'cache' }),
  datasetController.getDatasetById
);

// PUT /api/datasets/:id - Update a dataset (protected)
router.put(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(updateDatasetSchema),
  datasetController.updateDataset
);

// DELETE /api/datasets/:id - Delete a dataset (protected)
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  datasetController.deleteDataset
);

export default router;
