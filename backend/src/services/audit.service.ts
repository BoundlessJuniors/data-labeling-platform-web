import prisma from '../lib/db';
import { Prisma } from '@prisma/client';

export class AuditService {
  /**
   * Logs an administrative action to the database.
   */
  async logAction(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    metaJson?: Prisma.InputJsonValue,
    transaction?: Prisma.TransactionClient
  ) {
    const db = transaction || prisma;

    // Build the meta object, enforcing standard props when provided
    const payload = metaJson && typeof metaJson === 'object' 
      ? { ...metaJson, source: 'admin_panel' } 
      : { source: 'admin_panel', meta: metaJson };

    return db.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        metaJson: payload,
      },
    });
  }

  /**
   * Retrieves audit logs with pagination and filtering.
   */
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    actorSearch?: string;
    sortBy?: 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) {
      where.action = params.action;
    }
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.entityId) {
      where.entityId = params.entityId;
    }
    if (params.actorUserId) {
      where.actorUserId = params.actorUserId;
    }
    if (params.actorSearch) {
      where.actor = {
        OR: [
          { email: { contains: params.actorSearch, mode: 'insensitive' } },
          { displayName: { contains: params.actorSearch, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy: Prisma.AuditLogOrderByWithRelationInput = {
      [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, email: true, displayName: true, role: true },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

// Singleton export
export const auditService = new AuditService();
