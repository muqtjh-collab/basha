import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../services/auditService';

export class CustomerController {
  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const { status, search } = req.query;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (status) {
        whereClause.status = status as string;
      }

      if (search) {
        whereClause.OR = [
          { fullName: { contains: search as string, mode: 'insensitive' } },
          { fullNameAr: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { city: { contains: search as string, mode: 'insensitive' } },
          { cityAr: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;
      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;

      if (isAgent) {
        // Agents strictly see only their own customers
        whereClause.agentId = user.id;
      } else if (isBranchManager) {
        // Branch managers see customers under agents in their branch
        if (!user.branchId) {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 }
          });
        }
        whereClause.agent = {
          branchId: user.branchId
        };
      } else if (isSuperOrOps) {
        // Admins can filter by specific agent if provided in query params
        const qAgentId = req.query.agent_id as string;
        if (qAgentId) {
          whereClause.agentId = qAgentId;
        }
      } else {
        // Support staff or other roles read-only
        whereClause.agentId = user.id; // fallback
      }

      const [customers, total] = await Promise.all([
        db.customer.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            agent: {
              select: {
                id: true,
                fullName: true,
                fullNameAr: true
              }
            }
          }
        }),
        db.customer.count({ where: whereClause })
      ]);

      const formattedCustomers = customers.map(c => ({
        id: c.id,
        user_id: c.userId,
        agent_id: c.agentId,
        full_name: c.fullName,
        full_name_ar: c.fullNameAr,
        phone: c.phone,
        email: c.email,
        city: c.city,
        city_ar: c.cityAr,
        region: c.region,
        preferred_communication: c.preferredCommunication,
        notes: c.notes,
        status: c.status,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        created_by: c.createdBy,
        agent: c.agent ? {
          id: c.agent.id,
          full_name: c.agent.fullName,
          full_name_ar: c.agent.fullNameAr
        } : null
      }));

      res.status(200).json({
        success: true,
        data: formattedCustomers,
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

  static async getCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const customer = await db.customer.findUnique({
        where: { id },
        include: {
          agent: {
            select: {
              id: true,
              fullName: true,
              fullNameAr: true,
              branchId: true
            }
          }
        }
      });

      if (!customer) {
        throw new AppError(404, 'NOT_FOUND', 'العميل المطلوب غير موجود.');
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;
      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;

      if (isAgent && customer.agentId !== user.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      if (isBranchManager && customer.agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      res.status(200).json({
        success: true,
        data: {
          id: customer.id,
          user_id: customer.userId,
          agent_id: customer.agentId,
          full_name: customer.fullName,
          full_name_ar: customer.fullNameAr,
          phone: customer.phone,
          email: customer.email,
          city: customer.city,
          city_ar: customer.cityAr,
          region: customer.region,
          preferred_communication: customer.preferredCommunication,
          notes: customer.notes,
          status: customer.status,
          created_at: customer.createdAt,
          updated_at: customer.updatedAt,
          created_by: customer.createdBy,
          agent: customer.agent ? {
            id: customer.agent.id,
            full_name: customer.agent.fullName,
            full_name_ar: customer.agent.fullNameAr
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const {
        full_name,
        full_name_ar,
        phone,
        email,
        city,
        city_ar,
        region,
        preferred_communication,
        notes,
        status
      } = req.body;

      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;
      let targetAgentId = req.body.agent_id;

      if (isAgent) {
        targetAgentId = user.id;
      } else {
        if (!targetAgentId) {
          throw new AppError(400, 'BAD_REQUEST', 'يجب تحديد الوكيل المسؤول عن هذا العميل.');
        }

        // Validate the agent exists
        const agentExists = await db.user.findUnique({
          where: { id: targetAgentId },
          include: { role: true }
        });

        if (!agentExists) {
          throw new AppError(404, 'AGENT_NOT_FOUND', 'الوكيل المحدد غير موجود.');
        }
      }

      const newCustomer = await db.customer.create({
        data: {
          fullName: full_name,
          fullNameAr: full_name_ar,
          phone,
          email,
          city,
          cityAr: city_ar,
          region,
          preferredCommunication: preferred_communication,
          notes,
          status: status || 'active',
          agentId: targetAgentId,
          createdBy: user.id
        }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'customer_created',
        entityType: 'customer',
        entityId: newCustomer.id,
        newValue: newCustomer,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: {
          id: newCustomer.id,
          agent_id: newCustomer.agentId,
          full_name: newCustomer.fullName,
          full_name_ar: newCustomer.fullNameAr,
          phone: newCustomer.phone,
          email: newCustomer.email,
          city: newCustomer.city,
          city_ar: newCustomer.cityAr,
          region: newCustomer.region,
          preferred_communication: newCustomer.preferredCommunication,
          notes: newCustomer.notes,
          status: newCustomer.status,
          created_at: newCustomer.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const customer = await db.customer.findUnique({
        where: { id }
      });

      if (!customer) {
        throw new AppError(404, 'NOT_FOUND', 'العميل المطلوب غير موجود.');
      }

      // Enforce Data Scoping
      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;
      if (isAgent && customer.agentId !== user.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تعديل بيانات هذا العميل.');
      }

      const {
        full_name,
        full_name_ar,
        phone,
        email,
        city,
        city_ar,
        region,
        preferred_communication,
        notes,
        agent_id
      } = req.body;

      let targetAgentId = customer.agentId;
      if (agent_id !== undefined && !isAgent) {
        targetAgentId = agent_id;
        // Verify agent exists
        const agentExists = await db.user.findUnique({
          where: { id: targetAgentId }
        });
        if (!agentExists) {
          throw new AppError(404, 'AGENT_NOT_FOUND', 'الوكيل المحدد غير موجود.');
        }
      }

      const updatedCustomer = await db.customer.update({
        where: { id },
        data: {
          fullName: full_name !== undefined ? full_name : customer.fullName,
          fullNameAr: full_name_ar !== undefined ? full_name_ar : customer.fullNameAr,
          phone: phone !== undefined ? phone : customer.phone,
          email: email !== undefined ? email : customer.email,
          city: city !== undefined ? city : customer.city,
          cityAr: city_ar !== undefined ? city_ar : customer.cityAr,
          region: region !== undefined ? region : customer.region,
          preferredCommunication: preferred_communication !== undefined ? preferred_communication : customer.preferredCommunication,
          notes: notes !== undefined ? notes : customer.notes,
          agentId: targetAgentId
        }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'customer_updated',
        entityType: 'customer',
        entityId: id,
        oldValue: customer,
        newValue: updatedCustomer,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedCustomer.id,
          agent_id: updatedCustomer.agentId,
          full_name: updatedCustomer.fullName,
          full_name_ar: updatedCustomer.fullNameAr,
          phone: updatedCustomer.phone,
          email: updatedCustomer.email,
          city: updatedCustomer.city,
          city_ar: updatedCustomer.cityAr,
          region: updatedCustomer.region,
          preferred_communication: updatedCustomer.preferredCommunication,
          notes: updatedCustomer.notes,
          status: updatedCustomer.status,
          updated_at: updatedCustomer.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleCustomerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      if (!status || (status !== 'active' && status !== 'inactive')) {
        throw new AppError(400, 'BAD_REQUEST', 'الحالة المطلوبة غير صالحة.');
      }

      // Check RBAC role permission
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;

      if (!isSuperOrOps && !isBranchManager) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تعديل حالة العملاء.');
      }

      const customer = await db.customer.findUnique({
        where: { id },
        include: {
          agent: {
            select: { branchId: true }
          }
        }
      });

      if (!customer) {
        throw new AppError(404, 'NOT_FOUND', 'العميل المطلوب غير موجود.');
      }

      // Branch Manager scope constraint
      if (isBranchManager && customer.agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تعديل حالة عملاء تابعين لفروع أخرى.');
      }

      const updatedCustomer = await db.customer.update({
        where: { id },
        data: { status }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'customer_status_changed',
        entityType: 'customer',
        entityId: id,
        oldValue: { status: customer.status },
        newValue: { status: updatedCustomer.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedCustomer.id,
          full_name: updatedCustomer.fullName,
          status: updatedCustomer.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
