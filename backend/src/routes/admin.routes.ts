import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  idParamSchema,
  updateUserSchema,
  adminPaymentQuerySchema
} from '../validators/validation.schemas';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// GET /api/admin/dashboard - Dashboard statistics
router.get(
  '/dashboard',
  adminController.getDashboard
);

// GET /api/admin/users - Get all users
router.get(
  '/users',
  adminController.getUsers
);

// GET /api/admin/users/:id - Get a single user
router.get(
  '/users/:id',
  validate(idParamSchema, 'params'),
  adminController.getUserById
);

// PATCH /api/admin/users/:id - Update user
router.patch(
  '/users/:id',
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  adminController.updateUser
);

// DELETE /api/admin/users/:id - Delete user
router.delete(
  '/users/:id',
  validate(idParamSchema, 'params'),
  adminController.deleteUser
);

// GET /api/admin/monitoring/uploads - Upload/asset pipeline monitoring
router.get(
  '/monitoring/uploads',
  adminController.getUploadMonitoring
);

// GET /api/admin/monitoring/queues - BullMQ queue monitoring
router.get(
  '/monitoring/queues',
  adminController.getQueueMonitoring
);

// GET /api/admin/audit-logs - Admin audit logs
router.get(
  '/audit-logs',
  adminController.getAuditLogs
);

// GET /api/admin/payments/dashboard - Payment dashboard stats
router.get(
  '/payments/dashboard',
  adminController.getPaymentDashboardStats
);

// GET /api/admin/payments - Paginated payment records
router.get(
  '/payments',
  validate(adminPaymentQuerySchema, 'query'),
  adminController.getPayments
);

export default router;

