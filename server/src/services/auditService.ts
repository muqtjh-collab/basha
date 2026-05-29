import { Prisma, AuditAction } from '@prisma/client';
import { db } from '../config/database';

export async function logAction(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: object | null;
  newValue?: object | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    const logData: Prisma.AuditLogUncheckedCreateInput = {
      userId: params.userId,
      action: params.action as AuditAction,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue ? (params.oldValue as Prisma.InputJsonValue) : undefined,
      newValue: params.newValue ? (params.newValue as Prisma.InputJsonValue) : undefined,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    };

    await db.auditLog.create({
      data: logData,
    });
  } catch (error) {
    // Fail silently so they don't block core transactions, but log to console
    console.error('❌ Failed to write audit log entry:', error);
  }
}

export class AuditService {
  static async logAction(
    params: {
      userId: string | null;
      action: AuditAction;
      entityType: string;
      entityId: string;
      oldValue?: any;
      newValue?: any;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const prisma = tx || db;
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          oldValue: params.oldValue ? (params.oldValue as Prisma.InputJsonValue) : undefined,
          newValue: params.newValue ? (params.newValue as Prisma.InputJsonValue) : undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error('❌ Failed to write audit log entry:', error);
    }
  }
}

export default AuditService;
