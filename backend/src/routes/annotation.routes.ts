import { Router } from 'express';
import * as annotationController from '../controllers/annotation.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  createAnnotationRawSchema,
  normalizeAnnotationSchema,
  idParamSchema
} from '../validators/validation.schemas';

const router = Router();

// All annotation routes require authentication
router.use(authenticate);

// POST /api/annotations/raw - Create raw annotation
router.post(
  '/raw',
  validate(createAnnotationRawSchema),
  annotationController.createRawAnnotation
);

// POST /api/annotations/normalize - Normalize annotation
router.post(
  '/normalize',
  validate(normalizeAnnotationSchema),
  annotationController.normalizeAnnotation
);

export default router;
