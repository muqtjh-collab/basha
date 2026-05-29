import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../services/auditService';

export class UserController {
  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { roleId, status, fullName, fullNameAr, email, username } = req.body;

      const userToUpdate = await db.user.findUnique({
        where: { id },
        include: { role: true }
      });

      if (!userToUpdate) {
        throw new AppError(404, 'USER_NOT_FOUND', 'المستخدم المطلوب غير موجود في النظام.');
      }

      // Enforce Rule 4.2: Last remaining super_admin user account cannot be deleted or suspended
      if (
        userToUpdate.role.name === 'super_admin' &&
        (status === 'suspended' || status === 'deleted')
      ) {
        const superAdminRole = await db.role.findFirst({
          where: { name: 'super_admin' }
        });
        
        if (superAdminRole) {
          const activeSuperAdmins = await db.user.count({
            where: {
              roleId: superAdminRole.id,
              status: 'active'
            }
          });

          if (activeSuperAdmins <= 1) {
            throw new AppError(400, 'BAD_REQUEST', 'يجب أن يبقى مدير عام واحد على الأقل في النظام');
          }
        }
      }

      // Enforce Rule 4.3: A user cannot assign a role with a lower level number (higher authority) than their own level
      if (roleId && roleId !== userToUpdate.roleId) {
        const newRole = await db.role.findUnique({
          where: { id: roleId }
        });

        if (!newRole) {
          throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المختار غير موجود.');
        }

        if (req.user && newRole.level < req.user.role.level) {
          throw new AppError(403, 'FORBIDDEN', 'لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية');
        }
      }

      const updatedUser = await db.user.update({
        where: { id },
        data: {
          roleId: roleId || userToUpdate.roleId,
          status: status || userToUpdate.status,
          fullName: fullName || userToUpdate.fullName,
          fullNameAr: fullNameAr || userToUpdate.fullNameAr,
          email: email || userToUpdate.email,
          username: username || userToUpdate.username
        },
        include: { role: true }
      });

      // Log role assignment if role changed
      if (roleId && roleId !== userToUpdate.roleId) {
        await logAction({
          userId: req.user?.id || null,
          action: 'update',
          entityType: 'user_role_assignment',
          entityId: id,
          oldValue: { roleId: userToUpdate.roleId, roleName: userToUpdate.role.name },
          newValue: { roleId: updatedUser.roleId, roleName: updatedUser.role.name },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }

      // Log status change if status changed
      if (status && status !== userToUpdate.status) {
        await logAction({
          userId: req.user?.id || null,
          action: 'status_change',
          entityType: 'user',
          entityId: id,
          oldValue: { status: userToUpdate.status },
          newValue: { status: updatedUser.status },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const userToDelete = await db.user.findUnique({
        where: { id },
        include: { role: true }
      });

      if (!userToDelete) {
        throw new AppError(404, 'USER_NOT_FOUND', 'المستخدم المطلوب غير موجود في النظام.');
      }

      // Enforce Rule 4.2: Last remaining super_admin user account cannot be deleted
      if (userToDelete.role.name === 'super_admin') {
        const superAdminRole = await db.role.findFirst({
          where: { name: 'super_admin' }
        });
        
        if (superAdminRole) {
          const superAdminCount = await db.user.count({
            where: { roleId: superAdminRole.id }
          });

          if (superAdminCount <= 1) {
            throw new AppError(400, 'BAD_REQUEST', 'يجب أن يبقى مدير عام واحد على الأقل في النظام');
          }
        }
      }

      await db.user.delete({
        where: { id }
      });

      await logAction({
        userId: req.user?.id || null,
        action: 'delete',
        entityType: 'user',
        entityId: id,
        oldValue: userToDelete,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'تم حذف حساب المستخدم بنجاح'
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
