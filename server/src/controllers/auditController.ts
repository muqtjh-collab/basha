import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

export class AuditController {
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id, action, entity_type, date_from, date_to, page, limit } = req.query;

      const currentPage = Math.max(1, parseInt(page as string, 10) || 1);
      const limitVal = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (currentPage - 1) * limitVal;

      const where: Prisma.AuditLogWhereInput = {};

      if (user_id) {
        where.userId = user_id as string;
      }
      if (action) {
        where.action = action as any;
      }
      if (entity_type) {
        where.entityType = entity_type as string;
      }

      if (date_from || date_to) {
        where.createdAt = {};
        if (date_from) {
          where.createdAt.gte = new Date(date_from as string);
        }
        if (date_to) {
          where.createdAt.lte = new Date(date_to as string);
        }
      }

      const totalCount = await db.auditLog.count({ where });
      const totalPages = Math.ceil(totalCount / limitVal);

      const logs = await db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitVal,
        include: {
          user: {
            select: {
              id: true,
              fullNameAr: true,
              fullName: true,
              username: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          totalCount,
          currentPage,
          totalPages,
          logs
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
