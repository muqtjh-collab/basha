import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../services/auditService';

export class RoleController {
  static async getRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await db.role.findMany({
        orderBy: { level: 'asc' }
      });
      res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const role = await db.role.findUnique({
        where: { id }
      });

      if (!role) {
        throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المطلوب غير موجود في النظام.');
      }

      res.status(200).json({
        success: true,
        data: role
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, level, description } = req.body;
      const nameAr = req.body.name_ar || req.body.nameAr;
      const defaultPermissions = req.body.default_permissions || req.body.defaultPermissions;
      const descriptionAr = req.body.description_ar || req.body.descriptionAr;

      if (!name || !nameAr || level === undefined || !defaultPermissions) {
        throw new AppError(400, 'BAD_REQUEST', 'البيانات المطلوبة لإنشاء الدور غير مكتملة.');
      }

      const parsedLevel = parseInt(level, 10);
      if (isNaN(parsedLevel) || parsedLevel <= 0) {
        throw new AppError(400, 'BAD_REQUEST', 'يجب أن يكون مستوى الدور عدداً صحيحاً موجباً.');
      }

      // Check level hierarchy: A user cannot create a role with level lower than their own (higher authority)
      if (req.user && parsedLevel < req.user.role.level) {
        throw new AppError(403, 'FORBIDDEN', 'لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية');
      }

      // Enforce uniqueness of name
      const existingRole = await db.role.findUnique({
        where: { name }
      });
      if (existingRole) {
        throw new AppError(409, 'CONFLICT', 'اسم الدور باللغة الإنجليزية مستخدم بالفعل.');
      }

      const newRole = await db.role.create({
        data: {
          name,
          nameAr,
          level: parsedLevel,
          defaultPermissions,
          description,
          descriptionAr,
          isSystem: false // Custom roles created via API cannot be system roles
        }
      });

      // Log to audit log
      await logAction({
        userId: req.user?.id || null,
        action: 'create',
        entityType: 'role',
        entityId: newRole.id,
        newValue: newRole,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newRole
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, level, description } = req.body;
      const nameAr = req.body.name_ar || req.body.nameAr;
      const defaultPermissions = req.body.default_permissions || req.body.defaultPermissions;
      const descriptionAr = req.body.description_ar || req.body.descriptionAr;

      const role = await db.role.findUnique({
        where: { id }
      });

      if (!role) {
        throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المطلوب غير موجود في النظام.');
      }

      if (role.isSystem) {
        throw new AppError(400, 'BAD_REQUEST', 'لا يمكن تعديل الأدوار الأساسية للنظام');
      }

      let parsedLevel = role.level;
      if (level !== undefined) {
        parsedLevel = parseInt(level, 10);
        if (isNaN(parsedLevel) || parsedLevel <= 0) {
          throw new AppError(400, 'BAD_REQUEST', 'يجب أن يكون مستوى الدور عدداً صحيحاً موجباً.');
        }

        // Check hierarchy
        if (req.user && parsedLevel < req.user.role.level) {
          throw new AppError(403, 'FORBIDDEN', 'لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية');
        }
      }

      if (name && name !== role.name) {
        const existingRole = await db.role.findUnique({
          where: { name }
        });
        if (existingRole) {
          throw new AppError(409, 'CONFLICT', 'اسم الدور باللغة الإنجليزية مستخدم بالفعل.');
        }
      }

      const updatedRole = await db.role.update({
        where: { id },
        data: {
          name: name || role.name,
          nameAr: nameAr || role.nameAr,
          level: parsedLevel,
          defaultPermissions: defaultPermissions || role.defaultPermissions,
          description: description !== undefined ? description : role.description,
          descriptionAr: descriptionAr !== undefined ? descriptionAr : role.descriptionAr
        }
      });

      // Log to audit log
      await logAction({
        userId: req.user?.id || null,
        action: 'update',
        entityType: 'role',
        entityId: id,
        oldValue: role,
        newValue: updatedRole,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: updatedRole
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const role = await db.role.findUnique({
        where: { id }
      });

      if (!role) {
        throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المطلوب غير موجود في النظام.');
      }

      if (role.isSystem) {
        throw new AppError(400, 'BAD_REQUEST', 'لا يمكن حذف الأدوار الأساسية للنظام');
      }

      // Check if any user is currently assigned this role
      const userCount = await db.user.count({
        where: { roleId: id }
      });

      if (userCount > 0) {
        throw new AppError(400, 'BAD_REQUEST', 'لا يمكن حذف دور مرتبط بمستخدمين حاليين');
      }

      await db.role.delete({
        where: { id }
      });

      // Log to audit log
      await logAction({
        userId: req.user?.id || null,
        action: 'delete',
        entityType: 'role',
        entityId: id,
        oldValue: role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'تم حذف الدور بنجاح'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRoleUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const role = await db.role.findUnique({
        where: { id }
      });

      if (!role) {
        throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المطلوب غير موجود في النظام.');
      }

      const users = await db.user.findMany({
        where: { roleId: id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          fullNameAr: true,
          status: true,
          createdAt: true
        }
      });

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
}
