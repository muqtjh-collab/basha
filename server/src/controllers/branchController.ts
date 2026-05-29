import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../services/auditService';

export class BranchController {
  static async getBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const { status, search } = req.query;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const skip = (page - 1) * limit;

      // Construct filter criteria
      const whereClause: any = {};

      if (status) {
        whereClause.status = status as string;
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { nameAr: { contains: search as string, mode: 'insensitive' } },
          { city: { contains: search as string, mode: 'insensitive' } },
          { cityAr: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;

      if (isBranchManager) {
        if (!user.branchId) {
          // If branch manager has no branch, return empty list
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 }
          });
        }
        whereClause.id = user.branchId;
      } else if (!isSuperOrOps) {
        // Other roles are not allowed to read branches unless they have branches.read, 
        // but even if they have the permission, we restrict them based on role scope.
        // Senior/Junior agents see their own branch.
        if (user.branchId) {
          whereClause.id = user.branchId;
        } else {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 }
          });
        }
      }

      // Fetch branches & count
      const [branches, total] = await Promise.all([
        db.branch.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { nameAr: 'asc' },
          include: {
            _count: {
              select: { users: true }
            }
          }
        }),
        db.branch.count({ where: whereClause })
      ]);

      const formattedBranches = branches.map(b => ({
        id: b.id,
        name: b.name,
        name_ar: b.nameAr,
        city: b.city,
        city_ar: b.cityAr,
        region: b.region,
        region_ar: b.regionAr,
        status: b.status,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
        created_by: b.createdById,
        user_count: b._count.users
      }));

      res.status(200).json({
        success: true,
        data: formattedBranches,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      // Scoping check for Branch Manager
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;

      if (isBranchManager && user.branchId !== id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      const branch = await db.branch.findUnique({
        where: { id },
        include: {
          _count: {
            select: { users: true }
          }
        }
      });

      if (!branch) {
        throw new AppError(404, 'NOT_FOUND', 'الفرع المطلوب غير موجود.');
      }

      res.status(200).json({
        success: true,
        data: {
          id: branch.id,
          name: branch.name,
          name_ar: branch.nameAr,
          city: branch.city,
          city_ar: branch.cityAr,
          region: branch.region,
          region_ar: branch.regionAr,
          status: branch.status,
          created_at: branch.createdAt,
          updated_at: branch.updatedAt,
          created_by: branch.createdById,
          user_count: branch._count.users
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, name_ar, city, city_ar, region, region_ar, status } = req.body;
      const user = req.user;

      const newBranch = await db.branch.create({
        data: {
          name,
          nameAr: name_ar,
          city,
          cityAr: city_ar,
          region,
          regionAr: region_ar,
          status: status || 'active',
          createdById: user?.id || null
        }
      });

      // Log audit trail
      await logAction({
        userId: user?.id || null,
        action: 'branch_created',
        entityType: 'branch',
        entityId: newBranch.id,
        newValue: newBranch,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: {
          id: newBranch.id,
          name: newBranch.name,
          name_ar: newBranch.nameAr,
          city: newBranch.city,
          city_ar: newBranch.cityAr,
          region: newBranch.region,
          region_ar: newBranch.regionAr,
          status: newBranch.status,
          created_at: newBranch.createdAt,
          updated_at: newBranch.updatedAt,
          created_by: newBranch.createdById
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, name_ar, city, city_ar, region, region_ar } = req.body;
      const user = req.user;

      const branch = await db.branch.findUnique({
        where: { id }
      });

      if (!branch) {
        throw new AppError(404, 'NOT_FOUND', 'الفرع المطلوب غير موجود.');
      }

      const updatedBranch = await db.branch.update({
        where: { id },
        data: {
          name: name !== undefined ? name : branch.name,
          nameAr: name_ar !== undefined ? name_ar : branch.nameAr,
          city: city !== undefined ? city : branch.city,
          cityAr: city_ar !== undefined ? city_ar : branch.cityAr,
          region: region !== undefined ? region : branch.region,
          regionAr: region_ar !== undefined ? region_ar : branch.regionAr
        }
      });

      // Log audit trail
      await logAction({
        userId: user?.id || null,
        action: 'branch_updated',
        entityType: 'branch',
        entityId: id,
        oldValue: branch,
        newValue: updatedBranch,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedBranch.id,
          name: updatedBranch.name,
          name_ar: updatedBranch.nameAr,
          city: updatedBranch.city,
          city_ar: updatedBranch.cityAr,
          region: updatedBranch.region,
          region_ar: updatedBranch.regionAr,
          status: updatedBranch.status,
          created_at: updatedBranch.createdAt,
          updated_at: updatedBranch.updatedAt,
          created_by: updatedBranch.createdById
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleBranchStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;

      if (user?.role.name !== 'super_admin' && user?.role.level !== 1) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
      }

      if (!status || (status !== 'active' && status !== 'inactive')) {
        throw new AppError(400, 'BAD_REQUEST', 'الحالة المطلوبة غير صالحة.');
      }

      const branch = await db.branch.findUnique({
        where: { id }
      });

      if (!branch) {
        throw new AppError(404, 'NOT_FOUND', 'الفرع المطلوب غير موجود.');
      }

      // Block deactivation if branch has active users
      if (status === 'inactive') {
        const activeUsersCount = await db.user.count({
          where: {
            branchId: id,
            status: 'active'
          }
        });

        if (activeUsersCount > 0) {
          throw new AppError(400, 'BRANCH_HAS_ACTIVE_USERS', 'لا يمكن تعطيل فرع يحتوي على مستخدمين نشطين.');
        }
      }

      const updatedBranch = await db.branch.update({
        where: { id },
        data: { status }
      });

      // Log audit trail
      await logAction({
        userId: user?.id || null,
        action: 'branch_status_changed',
        entityType: 'branch',
        entityId: id,
        oldValue: { status: branch.status },
        newValue: { status: updatedBranch.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedBranch.id,
          name: updatedBranch.name,
          name_ar: updatedBranch.nameAr,
          status: updatedBranch.status
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;

      if (user?.role.name !== 'super_admin' && user?.role.level !== 1) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
      }

      const branch = await db.branch.findUnique({
        where: { id }
      });

      if (!branch) {
        throw new AppError(404, 'NOT_FOUND', 'الفرع المطلوب غير موجود.');
      }

      // Block soft delete if branch has active users
      const activeUsersCount = await db.user.count({
        where: {
          branchId: id,
          status: 'active'
        }
      });

      if (activeUsersCount > 0) {
        throw new AppError(400, 'BRANCH_HAS_ACTIVE_USERS', 'لا يمكن حذف فرع يحتوي على مستخدمين نشطين.');
      }

      // Soft delete: update status to inactive
      const updatedBranch = await db.branch.update({
        where: { id },
        data: { status: 'inactive' }
      });

      // Log audit trail
      await logAction({
        userId: user?.id || null,
        action: 'branch_deleted',
        entityType: 'branch',
        entityId: id,
        oldValue: branch,
        newValue: updatedBranch,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'تم حذف الفرع بنجاح (تعطيل السجل).'
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
