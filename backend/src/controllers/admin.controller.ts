import { Response, NextFunction } from 'express';
import { UserRole, Prisma } from '@prisma/client';
import prisma from '../lib/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';

// Get all users (admin only)
export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          ratingAvg: true,
          createdAt: true,
          _count: {
            select: {
              datasets: true,
              listingsOwned: true,
              contractsAsClient: true,
              contractsAsLabeler: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a single user by ID (admin only)
export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        ratingAvg: true,
        createdAt: true,
        _count: {
          select: {
            datasets: true,
            listingsOwned: true,
            contractsAsClient: true,
            contractsAsLabeler: true,
            taskLeases: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Update user (admin only)
export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, displayName } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Validate role
    if (role && !['client', 'labeler', 'admin'].includes(role)) {
      throw new BadRequestError('Invalid role. Must be client, labeler, or admin');
    }

    // Prevent admin from demoting themselves if they're the only admin
    if (existingUser.id === req.user?.id && role !== 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });

      if (adminCount <= 1) {
        throw new BadRequestError('Cannot demote the only admin user');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role: role as UserRole }),
        ...(displayName !== undefined && { displayName }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        ratingAvg: true,
        createdAt: true,
      },
    });

    logger.info(`User updated by admin: ${id}, new role: ${role || 'unchanged'}`);

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (admin only)
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Prevent admin from deleting themselves
    if (existingUser.id === req.user?.id) {
      throw new BadRequestError('Cannot delete your own admin account');
    }

    // Check if user has active contracts
    const activeContracts = await prisma.contract.count({
      where: {
        OR: [
          { clientUserId: id },
          { labelerUserId: id },
        ],
        status: { in: ['active', 'submitted'] },
      },
    });

    if (activeContracts > 0) {
      throw new BadRequestError('Cannot delete user with active contracts');
    }

    await prisma.user.delete({
      where: { id },
    });

    logger.info(`User deleted by admin: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
