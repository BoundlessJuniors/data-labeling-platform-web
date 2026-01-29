import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { 
  idParamSchema,
  updateUserSchema
} from '../validators/validation.schemas';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

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

export default router;
