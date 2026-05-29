import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../services/auditService';

export class AgentController {
  static async getAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const { branch_id, status, search } = req.query;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const skip = (page - 1) * limit;

      // Construct filter criteria
      // Target roles with levels 4 and 5 (senior_agent = 4, junior_agent = 5)
      const whereClause: any = {
        role: {
          level: { in: [4, 5] }
        }
      };

      if (status) {
        whereClause.status = status as any;
      } else {
        whereClause.status = { not: 'deleted' }; // exclude deleted users by default
      }

      if (search) {
        whereClause.OR = [
          { username: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { fullName: { contains: search as string, mode: 'insensitive' } },
          { fullNameAr: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;

      if (isBranchManager) {
        if (!user.branchId) {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 }
          });
        }
        whereClause.branchId = user.branchId;
      } else if (isSuperOrOps) {
        if (branch_id) {
          whereClause.branchId = branch_id as string;
        }
      } else {
        // Agents or other roles can only see themselves
        whereClause.id = user.id;
      }

      const [agents, total] = await Promise.all([
        db.user.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { fullNameAr: 'asc' },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                level: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            },
            _count: {
              select: {
                managedCustomers: true,
                managedVehicles: true
              }
            },
            wallet: {
              select: {
                id: true,
                balanceUsd: true,
                balanceIqd: true,
                status: true
              }
            }
          }
        }),
        db.user.count({ where: whereClause })
      ]);

      const formattedAgents = agents.map(a => ({
        id: a.id,
        username: a.username,
        email: a.email,
        phone: a.phone,
        full_name: a.fullName,
        full_name_ar: a.fullNameAr,
        role_id: a.roleId,
        branch_id: a.branchId,
        status: a.status,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
        role: a.role,
        branch: a.branch,
        customer_count: a._count.managedCustomers,
        vehicle_count: a._count.managedVehicles,
        wallet: a.wallet ? {
          id: a.wallet.id,
          balance_usd: a.wallet.balanceUsd,
          balance_iqd: a.wallet.balanceIqd,
          status: a.wallet.status
        } : { id: null, balance_usd: 0, balance_iqd: 0, status: 'active' }
      }));

      res.status(200).json({
        success: true,
        data: formattedAgents,
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

  static async getAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const agent = await db.user.findUnique({
        where: { id },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              level: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              nameAr: true
            }
          },
          _count: {
            select: {
              managedCustomers: true,
              managedVehicles: true
            }
          },
          wallet: {
            select: {
              id: true,
              balanceUsd: true,
              balanceIqd: true,
              status: true
            }
          }
        }
      });

      if (!agent || agent.status === 'deleted' || ![4, 5].includes(agent.role.level)) {
        throw new AppError(404, 'NOT_FOUND', 'الوكيل المطلوب غير موجود.');
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;

      if (isBranchManager && agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      if (!isSuperOrOps && !isBranchManager && agent.id !== user.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      res.status(200).json({
        success: true,
        data: {
          id: agent.id,
          username: agent.username,
          email: agent.email,
          phone: agent.phone,
          full_name: agent.fullName,
          full_name_ar: agent.fullNameAr,
          role_id: agent.roleId,
          branch_id: agent.branchId,
          status: agent.status,
          created_at: agent.createdAt,
          updated_at: agent.updatedAt,
          role: agent.role,
          branch: agent.branch,
          customer_count: agent._count.managedCustomers,
          vehicle_count: agent._count.managedVehicles,
          wallet: agent.wallet ? {
            id: agent.wallet.id,
            balance_usd: agent.wallet.balanceUsd,
            balance_iqd: agent.wallet.balanceIqd,
            status: agent.wallet.status
          } : { id: null, balance_usd: 0, balance_iqd: 0, status: 'active' }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const {
        username,
        email,
        phone,
        password,
        full_name,
        full_name_ar,
        role_id,
        branch_id,
        status
      } = req.body;

      // Validate the role is agent-level and exists
      const targetRole = await db.role.findUnique({
        where: { id: role_id }
      });

      if (!targetRole) {
        throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المختار غير موجود.');
      }

      if (![4, 5].includes(targetRole.level)) {
        throw new AppError(400, 'BAD_REQUEST', 'يجب أن يكون الدور المحدد وكيل أول أو وكيل مبتدئ.');
      }

      // Enforce Rule: A user cannot assign a role with level number lower than their own (higher authority)
      if (targetRole.level < user.role.level) {
        throw new AppError(403, 'FORBIDDEN', 'لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية.');
      }

      // Check unique constraints (username and email)
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { username: username },
            ...(email ? [{ email: email }] : [])
          ]
        }
      });

      if (existingUser) {
        if (existingUser.username === username) {
          throw new AppError(409, 'CONFLICT', 'اسم المستخدم مستخدم بالفعل.');
        }
        throw new AppError(409, 'CONFLICT', 'البريد الإلكتروني مستخدم بالفعل.');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create Agent & initialize wallet
      const newAgent = await db.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            username,
            email,
            phone,
            passwordHash,
            fullName: full_name,
            fullNameAr: full_name_ar,
            roleId: role_id,
            branchId: branch_id || null,
            status: status || 'active',
            createdBy: user.id
          },
          include: { role: true, branch: true }
        });

        // Initialize wallet for new agent
        await tx.wallet.create({
          data: {
            agentId: createdUser.id,
            balanceUsd: 0,
            balanceIqd: 0,
            status: 'active'
          }
        });

        return createdUser;
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'agent_created',
        entityType: 'user',
        entityId: newAgent.id,
        newValue: {
          id: newAgent.id,
          username: newAgent.username,
          fullName: newAgent.fullName,
          fullNameAr: newAgent.fullNameAr,
          role: newAgent.role.name,
          branchId: newAgent.branchId
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: {
          id: newAgent.id,
          username: newAgent.username,
          email: newAgent.email,
          phone: newAgent.phone,
          full_name: newAgent.fullName,
          full_name_ar: newAgent.fullNameAr,
          role_id: newAgent.roleId,
          branch_id: newAgent.branchId,
          status: newAgent.status,
          created_at: newAgent.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const agentToUpdate = await db.user.findUnique({
        where: { id },
        include: { role: true }
      });

      if (!agentToUpdate || agentToUpdate.status === 'deleted') {
        throw new AppError(404, 'NOT_FOUND', 'الوكيل المطلوب غير موجود.');
      }

      const {
        username,
        email,
        phone,
        password,
        full_name,
        full_name_ar,
        role_id,
        branch_id
      } = req.body;

      const updateData: any = {};

      if (username !== undefined) {
        if (username !== agentToUpdate.username) {
          const checkUsername = await db.user.findUnique({ where: { username } });
          if (checkUsername) {
            throw new AppError(409, 'CONFLICT', 'اسم المستخدم مستخدم بالفعل.');
          }
        }
        updateData.username = username;
      }

      if (email !== undefined) {
        if (email !== agentToUpdate.email) {
          const checkEmail = await db.user.findUnique({ where: { email } });
          if (checkEmail) {
            throw new AppError(409, 'CONFLICT', 'البريد الإلكتروني مستخدم بالفعل.');
          }
        }
        updateData.email = email;
      }

      if (phone !== undefined) updateData.phone = phone;
      if (full_name !== undefined) updateData.fullName = full_name;
      if (full_name_ar !== undefined) updateData.fullNameAr = full_name_ar;
      if (branch_id !== undefined) updateData.branchId = branch_id;

      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 12);
      }

      if (role_id !== undefined && role_id !== agentToUpdate.roleId) {
        const newRole = await db.role.findUnique({ where: { id: role_id } });
        if (!newRole) {
          throw new AppError(404, 'ROLE_NOT_FOUND', 'الدور المختار غير موجود.');
        }

        if (![4, 5].includes(newRole.level)) {
          throw new AppError(400, 'BAD_REQUEST', 'يجب أن يكون الدور المحدد وكيل أول أو وكيل مبتدئ.');
        }

        // Cannot assign a role with level number lower than own level (higher authority)
        if (newRole.level < user.role.level) {
          throw new AppError(403, 'FORBIDDEN', 'لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية.');
        }

        updateData.roleId = role_id;
      }

      const updatedAgent = await db.user.update({
        where: { id },
        data: updateData,
        include: { role: true }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'agent_updated',
        entityType: 'user',
        entityId: id,
        oldValue: {
          username: agentToUpdate.username,
          fullName: agentToUpdate.fullName,
          roleId: agentToUpdate.roleId,
          branchId: agentToUpdate.branchId
        },
        newValue: {
          username: updatedAgent.username,
          fullName: updatedAgent.fullName,
          roleId: updatedAgent.roleId,
          branchId: updatedAgent.branchId
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedAgent.id,
          username: updatedAgent.username,
          email: updatedAgent.email,
          phone: updatedAgent.phone,
          full_name: updatedAgent.fullName,
          full_name_ar: updatedAgent.fullNameAr,
          role_id: updatedAgent.roleId,
          branch_id: updatedAgent.branchId,
          status: updatedAgent.status,
          updated_at: updatedAgent.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleAgentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      if (!status || !['active', 'suspended', 'deleted'].includes(status)) {
        throw new AppError(400, 'BAD_REQUEST', 'الحالة المطلوبة غير صالحة.');
      }

      // Only Super Admin & Operations Manager can toggle status of agents
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      if (!isSuperOrOps) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تغيير حالة الوكلاء.');
      }

      const agent = await db.user.findUnique({
        where: { id },
        include: { role: true }
      });

      if (!agent || agent.status === 'deleted') {
        throw new AppError(404, 'NOT_FOUND', 'الوكيل المطلوب غير موجود.');
      }

      // Enforce last remaining super admin protection
      if (agent.role.name === 'super_admin' && (status === 'suspended' || status === 'deleted')) {
        const superAdminRole = await db.role.findFirst({ where: { name: 'super_admin' } });
        if (superAdminRole) {
          const activeSuperAdmins = await db.user.count({
            where: { roleId: superAdminRole.id, status: 'active' }
          });
          if (activeSuperAdmins <= 1) {
            throw new AppError(400, 'BAD_REQUEST', 'يجب أن يبقى مدير عام واحد على الأقل في النظام.');
          }
        }
      }

      const updatedAgent = await db.user.update({
        where: { id },
        data: { status: status as any }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'agent_status_changed',
        entityType: 'user',
        entityId: id,
        oldValue: { status: agent.status },
        newValue: { status: updatedAgent.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedAgent.id,
          username: updatedAgent.username,
          status: updatedAgent.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
