import { Router } from 'express';
import * as labelsetController from '../controllers/labelset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOrClient } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLabelSetSchema, updateLabelSetSchema, idParamSchema, addLabelSchema } from '../validators/validation.schemas';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache.middleware';

const router = Router();

// GET /api/labelsets - Get all labelsets
router.get(
  '/',
  authenticate,
  cacheMiddleware({ ttl: 60, keyPrefix: 'cache' }),
  labelsetController.getLabelSets
);

// POST /api/labelsets - Create a new labelset
router.post(
  '/',
  authenticate,
  adminOrClient,
  validate(createLabelSetSchema),
  invalidateCache(['cache:/api/v1/labelsets*']),
  labelsetController.createLabelSet
);

// GET /api/labelsets/:id - Get a single labelset with labels
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  cacheMiddleware({ ttl: 120, keyPrefix: 'cache' }),
  labelsetController.getLabelSetById
);

// POST /api/labelsets/:id/labels - Add a label to a labelset
router.post(
  '/:id/labels',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(addLabelSchema),
  invalidateCache(['cache:/api/v1/labelsets*']),
  labelsetController.addLabel
);

// PUT /api/labelsets/:id - Update a labelset
router.put(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(updateLabelSetSchema),
  invalidateCache(['cache:/api/v1/labelsets*']),
  labelsetController.updateLabelSet
);

// DELETE /api/labelsets/:id - Delete a labelset
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  invalidateCache(['cache:/api/v1/labelsets*']),
  labelsetController.deleteLabelSet
);

export default router;
