import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from './errorHandler';

export const requirePermission = (moduleKey: string, actionKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      // Fetch fresh role and permissions from DB
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        include: { role: true }
      });

      if (!dbUser) {
        throw new AppError(401, 'USER_NOT_FOUND', 'المستخدم غير موجود في النظام.');
      }

      // Customer check: customer accounts are strictly blocked from all admin/agent routes
      if (dbUser.role.name === 'customer' || dbUser.role.level >= 10) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message_ar: 'لا تملك صلاحية الوصول إلى هذه الصفحة.'
          }
        });
      }

      // Super Admin bypass
      if (dbUser.role.name === 'super_admin' || dbUser.role.level === 1) {
        return next();
      }

      const rolePermissions = (dbUser.role.defaultPermissions as any) || {};
      const customPermissions = (dbUser.customPermissions as any) || {};

      // Merge role default permissions with custom overrides on a per-key basis
      // (customPermissions overrides role default permissions)
      const mergedPermissions = { ...rolePermissions };
      for (const key in customPermissions) {
        if (customPermissions[key]) {
          mergedPermissions[key] = {
            ...(mergedPermissions[key] || {}),
            ...customPermissions[key]
          };
        }
      }

      // Check if permission is granted
      const modulePerms = mergedPermissions[moduleKey];
      if (modulePerms && modulePerms[actionKey] === true) {
        return next();
      }

      // Not allowed
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message_ar: 'لا تملك صلاحية الوصول إلى هذه الصفحة.'
        }
      });
    } catch (error) {
      next(error);
    }
  };
};
