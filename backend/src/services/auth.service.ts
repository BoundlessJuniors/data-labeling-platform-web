import bcrypt from 'bcrypt';
import prisma from '../lib/db';
import { generateToken, generateDesktopToken } from '../middlewares/auth.middleware';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';
import { UserRole, InviteRequestStatus } from '@prisma/client';
import { getBetaLimits } from '../config/beta-limits';

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    role: UserRole;
    displayName: string;
    inviteCode?: string;
  }) {
    // Check if user already exists
    const normalizedEmail = data.email.trim().toLowerCase();
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const { maxRegisteredUsers, publicRegisterLimit } = getBetaLimits();

    return await prisma.$transaction(async (tx) => {
      // Check total users limit
      const totalUsers = await tx.user.count();

      if (totalUsers >= maxRegisteredUsers) {
        throw new BadRequestError('Beta is currently full. No new registrations are allowed.');
      }

      // Check invite code requirement
      if (totalUsers >= publicRegisterLimit) {
        if (!data.inviteCode) {
          throw new BadRequestError('An invite code is required to register at this time.');
        }

        const invite = await tx.inviteCode.findUnique({
          where: { code: data.inviteCode },
        });

        if (!invite || invite.usedAt || (invite.expiresAt && invite.expiresAt < new Date())) {
          throw new BadRequestError('Invalid or expired invite code.');
        }

        if (invite.email && invite.email !== normalizedEmail) {
          throw new BadRequestError('This invite code is not valid for this email address.');
        }

        // Mark code as used conditionally to avoid race condition
        const updatedCount = await tx.inviteCode.updateMany({
          where: { 
            id: invite.id,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        });

        if (updatedCount.count === 0) {
          throw new BadRequestError('Invalid or expired invite code.');
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Create user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: data.role,
          displayName: data.displayName,
        },
        select: {
          id: true,
          email: true,
          role: true,
          displayName: true,
          createdAt: true,
        },
      });

      // If invite code was used, link it to the new user
      if (data.inviteCode && totalUsers >= publicRegisterLimit) {
        await tx.inviteCode.update({
          where: { code: data.inviteCode },
          data: { usedByUserId: user.id },
        });
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        clientType: 'browser',
      });

      logger.info(`User registered: ${user.email}`);

      return { user, token };
    });
  }

  /**
   * Request an invite code
   */
  async requestInvite(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Safe generic response
      return;
    }

    const existingRequest = await prisma.inviteRequest.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingRequest) {
      // Safe generic response
      return;
    }

    await prisma.inviteRequest.create({
      data: {
        email: normalizedEmail,
        status: InviteRequestStatus.pending,
      },
    });

    logger.info(`Invite requested: ${normalizedEmail}`);
  }


  /**
   * Login user
   */
  async login(data: { email: string; password: string; clientType?: 'browser' | 'desktop' }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clientType: data.clientType || 'browser',
    };
    
    const token = payload.clientType === 'desktop' 
      ? generateDesktopToken(payload) 
      : generateToken(payload);


    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      token,
    };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        ratingAvg: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }
}
