import { Prisma, UserRole } from '@prisma/client';
import prisma from '../lib/db';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import logger from '../lib/logger';

export class AdminService {
  /**
   * Get all users (admin only)
   */
  async getUsers(
    page: number,
    limit: number,
    role?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;

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

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single user by ID (admin only)
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    return user;
  }

  /**
   * Update user (admin only)
   */
  async updateUser(
    targetUserId: string,
    adminUserId: string,
    data: { role?: string; displayName?: string }
  ) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Validate role
    if (data.role && !['client', 'labeler', 'admin'].includes(data.role)) {
      throw new BadRequestError('Invalid role. Must be client, labeler, or admin');
    }

    // Prevent admin from demoting themselves if they're the only admin
    if (existingUser.id === adminUserId && data.role && data.role !== 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });

      if (adminCount <= 1) {
        throw new BadRequestError('Cannot demote the only admin user');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        ...(data.role && { role: data.role as UserRole }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
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

    logger.info(`User updated by admin: ${targetUserId}, new role: ${data.role || 'unchanged'}`);

    return updatedUser;
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(targetUserId: string, adminUserId: string) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Prevent admin from deleting themselves
    if (existingUser.id === adminUserId) {
      throw new BadRequestError('Cannot delete your own admin account');
    }

    // Check if user has active contracts
    const activeContracts = await prisma.contract.count({
      where: {
        OR: [
          { clientUserId: targetUserId },
          { labelerUserId: targetUserId },
        ],
        status: { in: ['active', 'submitted'] },
      },
    });

    if (activeContracts > 0) {
      throw new BadRequestError('Cannot delete user with active contracts');
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    logger.info(`User deleted by admin: ${targetUserId}`);
  }
}
