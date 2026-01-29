import { Router } from 'express';
import * as labelsetController from '../controllers/labelset.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOrClient } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createLabelSetSchema, idParamSchema } from '../validators/validation.schemas';
import { cacheMiddleware } from '../middlewares/cache.middleware';

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
  labelsetController.addLabel
);

// DELETE /api/labelsets/:id - Delete a labelset
router.delete(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  labelsetController.deleteLabelSet
);

export default router;
