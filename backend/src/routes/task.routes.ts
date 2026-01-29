import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  idParamSchema,
  leaseTaskSchema,
  submitTaskSchema,
  rejectTaskSchema
} from '../validators/validation.schemas';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// GET /api/tasks - Get all tasks
router.get(
  '/',
  taskController.getTasks
);

// GET /api/tasks/:id - Get a single task
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  taskController.getTaskById
);

// POST /api/tasks/:id/lease - Lease a task
router.post(
  '/:id/lease',
  validate(idParamSchema, 'params'),
  validate(leaseTaskSchema),
  taskController.leaseTask
);

// POST /api/tasks/:id/submit - Submit task with annotation
router.post(
  '/:id/submit',
  validate(idParamSchema, 'params'),
  validate(submitTaskSchema),
  taskController.submitTask
);

// PATCH /api/tasks/:id/accept - Accept task (QC)
router.patch(
  '/:id/accept',
  validate(idParamSchema, 'params'),
  taskController.acceptTask
);

// PATCH /api/tasks/:id/reject - Reject task (QC)
router.patch(
  '/:id/reject',
  validate(idParamSchema, 'params'),
  validate(rejectTaskSchema),
  taskController.rejectTask
);

// POST /api/tasks/release-expired - Release expired leases (admin only)
router.post(
  '/release-expired',
  adminOnly,
  taskController.releaseExpiredLeases
);

export default router;
