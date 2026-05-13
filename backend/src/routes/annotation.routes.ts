import { Router } from 'express';
import * as annotationController from '../controllers/annotation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  createAnnotationRawSchema,
  normalizeAnnotationSchema,
  idParamSchema
} from '../validators/validation.schemas';

// ============================================================================
// Annotation Routes (admin-only debug/reprocess endpoints)
//
// IMPORTANT — Two separate annotation submission paths exist:
//
// 1. CANONICAL LABELER PATH:
//    POST /api/tasks/:id/submit  (see task.routes.ts)
//    - Used by the Desktop App to submit completed annotations
//    - Requires a valid leaseToken
//    - Raw annotation rows include leaseToken → included in normalize pipeline
//
// 2. ADMIN DEBUG/REPROCESS PATH (this file):
//    POST /api/annotations/raw
//    - Admin-only endpoint for manual raw annotation insertion
//    - Rows intentionally OMIT leaseToken
//    - Normalize worker excludes these rows (filters lease_token IS NOT NULL)
//
//    POST /api/annotations/normalize
//    - Admin-only endpoint for manual normalization (upsert)
//    - Useful for debugging or correcting normalized data
//
// Future developers: do NOT confuse these two flows.
// ============================================================================

const router = Router();

// All annotation routes require authentication
router.use(authenticate);

// POST /api/annotations/raw - Create raw annotation (admin-only debug/reprocess)
router.post(
  '/raw',
  adminOnly,
  validate(createAnnotationRawSchema),
  annotationController.createRawAnnotation
);

// POST /api/annotations/normalize - Normalize annotation (admin-only debug/reprocess)
router.post(
  '/normalize',
  adminOnly,
  validate(normalizeAnnotationSchema),
  annotationController.normalizeAnnotation
);

// GET /api/annotations/task/:id - Get annotations for a task (admin-only)
router.get(
  '/task/:id',
  adminOnly,
  validate(idParamSchema, 'params'),
  annotationController.getTaskAnnotations
);

export default router;

