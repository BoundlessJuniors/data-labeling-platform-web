import { Router } from 'express';
import authRoutes from './auth.routes';
import datasetRoutes from './dataset.routes';
import assetRoutes from './asset.routes';
import labelsetRoutes from './labelset.routes';
import listingRoutes from './listing.routes';
import contractRoutes from './contract.routes';
import taskRoutes from './task.routes';
import annotationRoutes from './annotation.routes';
import reviewRoutes from './review.routes';
import adminRoutes from './admin.routes';
import * as taskController from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamSchema } from '../validators/validation.schemas';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/datasets', datasetRoutes);
router.use('/assets', assetRoutes);
router.use('/labelsets', labelsetRoutes);
router.use('/listings', listingRoutes);
router.use('/contracts', contractRoutes);
router.use('/tasks', taskRoutes);
router.use('/annotations', annotationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);

// Special routes
// POST /api/listings/:id/generate-tasks
router.post(
  '/listings/:id/generate-tasks',
  authenticate,
  validate(idParamSchema, 'params'),
  taskController.generateTasks
);

// GET /api/tasks/:id/annotations (mounted directly for cleaner URL)
import * as annotationController from '../controllers/annotation.controller';
router.get(
  '/tasks/:id/annotations',
  authenticate,
  validate(idParamSchema, 'params'),
  annotationController.getTaskAnnotations
);

export default router;
