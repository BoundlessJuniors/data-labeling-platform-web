import bcrypt from 'bcrypt';
import prisma from '../lib/db';
import { generateToken, generateDesktopToken } from '../middlewares/auth.middleware';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../lib/logger';
import crypto from 'node:crypto';
import { getDesktopRefreshTokenSecret } from '../config/security';
import { parseExpirationToMs, DESKTOP_REFRESH_TOKEN_EXPIRES_IN, DESKTOP_JWT_EXPIRES_IN } from '../utils/auth.util';
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
   * Login user specifically for Browser/Web, issuing an httpOnly cookie.
   */
  async login(data: { email: string; password: string }) {
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
      clientType: 'browser' as const,
    };
    
    const token = generateToken(payload);


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
   * Login user specifically for Desktop Client, issuing access and refresh tokens.
   */
  async loginDesktop(data: { email: string; password: string; deviceName?: string; userAgent?: string; ipAddress?: string }) {
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

    const sessionId = crypto.randomUUID();
    const randomSecret = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHmac('sha256', getDesktopRefreshTokenSecret()).update(randomSecret).digest('hex');
    const rawRefreshToken = `${sessionId}.${randomSecret}`;

    const nowMs = Date.now();
    const accessTokenExpiresAt = new Date(nowMs + parseExpirationToMs(DESKTOP_JWT_EXPIRES_IN));
    const refreshTokenExpiresAt = new Date(nowMs + parseExpirationToMs(DESKTOP_REFRESH_TOKEN_EXPIRES_IN));

    await prisma.desktopSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash,
        deviceName: data.deviceName,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        lastUsedAt: new Date(),
      }
    });

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      clientType: 'desktop' as const,
      sessionId,
      tokenUse: 'access' as const,
    };
    
    const token = generateDesktopToken(payload);

    logger.info(`User logged in from desktop: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
      accessToken: token,
      refreshToken: rawRefreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      sessionId,
    };
  }

  /**
   * Refresh Desktop Session and rotate refresh token.
   */
  async refreshDesktopSession(refreshToken: string) {
    if (typeof refreshToken !== 'string') {
      throw new UnauthorizedError('Invalid refresh token format');
    }

    const parts = refreshToken.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new UnauthorizedError('Invalid refresh token format');
    }

    const [sessionId, randomSecret] = parts;
    
    const session = await prisma.desktopSession.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    const providedHash = crypto.createHmac('sha256', getDesktopRefreshTokenSecret()).update(randomSecret).digest('hex');

    if (session.refreshTokenHash !== providedHash) {
      // Refresh token reuse or mismatch - revoke session immediately for safety
      await prisma.desktopSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date(), revokedReason: 'refresh_token_reuse' }
      });
      throw new UnauthorizedError('Invalid or expired session');
    }

    if (session.revokedAt) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    if (session.refreshTokenExpiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    const newRandomSecret = crypto.randomBytes(64).toString('hex');
    const newRefreshTokenHash = crypto.createHmac('sha256', getDesktopRefreshTokenSecret()).update(newRandomSecret).digest('hex');
    const rawNewRefreshToken = `${sessionId}.${newRandomSecret}`;

    const nowMs = Date.now();
    const newAccessTokenExpiresAt = new Date(nowMs + parseExpirationToMs(DESKTOP_JWT_EXPIRES_IN));
    const newRefreshTokenExpiresAt = new Date(nowMs + parseExpirationToMs(DESKTOP_REFRESH_TOKEN_EXPIRES_IN));

    const result = await prisma.desktopSession.updateMany({
      where: {
        id: sessionId,
        refreshTokenHash: providedHash,
        refreshTokenVersion: session.refreshTokenVersion,
        revokedAt: null
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenVersion: session.refreshTokenVersion + 1,
        lastUsedAt: new Date(),
        accessTokenExpiresAt: newAccessTokenExpiresAt,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      }
    });

    if (result.count === 0) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    const payload = {
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      clientType: 'desktop' as const,
      sessionId,
      tokenUse: 'access' as const,
    };

    const newAccessToken = generateDesktopToken(payload);

    return {
      accessToken: newAccessToken,
      refreshToken: rawNewRefreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
      sessionId,
    };
  }

  /**
   * Revoke Desktop Session.
   */
  async revokeDesktopSession(sessionId: string) {
    await prisma.desktopSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' }
    });
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
