import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logAction } from '../services/auditService';

export class VehicleController {
  static async getVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const { status, search, customer_id } = req.query;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (status) {
        whereClause.status = status as string;
      }

      if (customer_id) {
        whereClause.customerId = customer_id as string;
      }

      if (search) {
        whereClause.OR = [
          { vin: { contains: search as string, mode: 'insensitive' } },
          { lotNumber: { contains: search as string, mode: 'insensitive' } },
          { make: { contains: search as string, mode: 'insensitive' } },
          { model: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;
      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;

      if (isAgent) {
        // Agents strictly see only their own vehicles, ignore agent_id query param
        whereClause.agentId = user.id;
      } else if (isBranchManager) {
        // Branch managers see vehicles under agents in their branch
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
        const qAgentId = req.query.agent_id as string;
        if (qAgentId) {
          whereClause.agentId = qAgentId;
        }
      } else {
        // Support staff or other roles fallback
        whereClause.agentId = user.id;
      }

      const [vehicles, total] = await Promise.all([
        db.vehicle.findMany({
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
            },
            customer: {
              select: {
                id: true,
                fullName: true,
                fullNameAr: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            }
          }
        }),
        db.vehicle.count({ where: whereClause })
      ]);

      const formattedVehicles = vehicles.map(v => ({
        id: v.id,
        vin: v.vin,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        color_ar: v.colorAr,
        lot_number: v.lotNumber,
        auction_source: v.auctionSource,
        purchase_price_usd: v.purchasePriceUsd,
        purchase_price_iqd: v.purchasePriceIqd,
        auction_fees_usd: v.auctionFeesUsd,
        shipping_fees_usd: v.shippingFeesUsd,
        shipping_fees_iqd: v.shippingFeesIqd,
        other_fees_usd: v.otherFeesUsd,
        other_fees_iqd: v.otherFeesIqd,
        total_cost_usd: v.totalCostUsd,
        total_cost_iqd: v.totalCostIqd,
        current_stage: v.currentStage,
        user_tracking_stage: v.userTrackingStage,
        agent_id: v.agentId,
        customer_id: v.customerId,
        branch_id: v.branchId,
        status: v.status,
        notes: v.notes,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
        agent: v.agent ? {
          id: v.agent.id,
          full_name: v.agent.fullName,
          full_name_ar: v.agent.fullNameAr
        } : null,
        customer: v.customer ? {
          id: v.customer.id,
          full_name: v.customer.fullName,
          full_name_ar: v.customer.fullNameAr
        } : null,
        branch: v.branch ? {
          id: v.branch.id,
          name: v.branch.name,
          name_ar: v.branch.nameAr
        } : null
      }));

      res.status(200).json({
        success: true,
        data: formattedVehicles,
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

  static async getVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const vehicle = await db.vehicle.findUnique({
        where: { id },
        include: {
          agent: {
            select: {
              id: true,
              fullName: true,
              fullNameAr: true,
              branchId: true
            }
          },
          customer: {
            select: {
              id: true,
              fullName: true,
              fullNameAr: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              nameAr: true
            }
          },
          closedByUser: {
            select: {
              id: true,
              fullName: true,
              fullNameAr: true
            }
          }
        }
      });

      if (!vehicle) {
        throw new AppError(404, 'NOT_FOUND', 'المركبة المطلوبة غير موجودة.');
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;
      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;

      if (isAgent && vehicle.agentId !== user.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      if (isBranchManager && vehicle.agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
      }

      res.status(200).json({
        success: true,
        data: {
          id: vehicle.id,
          vin: vehicle.vin,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          color_ar: vehicle.colorAr,
          lot_number: vehicle.lotNumber,
          auction_source: vehicle.auctionSource,
          purchase_price_usd: vehicle.purchasePriceUsd,
          purchase_price_iqd: vehicle.purchasePriceIqd,
          auction_fees_usd: vehicle.auctionFeesUsd,
          shipping_fees_usd: vehicle.shippingFeesUsd,
          shipping_fees_iqd: vehicle.shippingFeesIqd,
          other_fees_usd: vehicle.otherFeesUsd,
          other_fees_iqd: vehicle.otherFeesIqd,
          total_cost_usd: vehicle.totalCostUsd,
          total_cost_iqd: vehicle.totalCostIqd,
          current_stage: vehicle.currentStage,
          user_tracking_stage: vehicle.userTrackingStage,
          agent_id: vehicle.agentId,
          customer_id: vehicle.customerId,
          branch_id: vehicle.branchId,
          status: vehicle.status,
          notes: vehicle.notes,
          created_at: vehicle.createdAt,
          updated_at: vehicle.updatedAt,
          is_closed: vehicle.isClosed,
          closed_at: vehicle.closedAt,
          closed_by: vehicle.closedBy,
          closed_by_user: vehicle.closedByUser ? {
            id: vehicle.closedByUser.id,
            full_name: vehicle.closedByUser.fullName,
            full_name_ar: vehicle.closedByUser.fullNameAr
          } : null,
          agent: vehicle.agent ? {
            id: vehicle.agent.id,
            full_name: vehicle.agent.fullName,
            full_name_ar: vehicle.agent.fullNameAr
          } : null,
          customer: vehicle.customer ? {
            id: vehicle.customer.id,
            full_name: vehicle.customer.fullName,
            full_name_ar: vehicle.customer.fullNameAr
          } : null,
          branch: vehicle.branch ? {
            id: vehicle.branch.id,
            name: vehicle.branch.name,
            name_ar: vehicle.branch.nameAr
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const {
        vin,
        make,
        model,
        year,
        color,
        color_ar,
        lot_number,
        auction_source,
        purchase_price_usd,
        purchase_price_iqd,
        auction_fees_usd,
        shipping_fees_usd,
        shipping_fees_iqd,
        other_fees_usd,
        other_fees_iqd,
        customer_id,
        branch_id,
        status,
        notes
      } = req.body;

      // Validate VIN uniqueness
      const existingVehicle = await db.vehicle.findUnique({
        where: { vin }
      });
      if (existingVehicle) {
        throw new AppError(409, 'CONFLICT', 'رقم الهيكل VIN هذا مسجل بالفعل لسيارة أخرى.');
      }

      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;
      let targetAgentId = req.body.agent_id;

      if (isAgent) {
        targetAgentId = user.id;
      } else {
        if (!targetAgentId) {
          throw new AppError(400, 'BAD_REQUEST', 'يجب تحديد الوكيل المسؤول عن هذه المركبة.');
        }
        // Verify agent exists
        const agentExists = await db.user.findUnique({ where: { id: targetAgentId } });
        if (!agentExists) {
          throw new AppError(404, 'AGENT_NOT_FOUND', 'الوكيل المحدد غير موجود.');
        }
      }

      // Enforce total calculations
      const pUsd = purchase_price_usd || 0;
      const aUsd = auction_fees_usd || 0;
      const sUsd = shipping_fees_usd || 0;
      const oUsd = other_fees_usd || 0;
      const totalCostUsd = pUsd + aUsd + sUsd + oUsd;

      const pIqd = purchase_price_iqd || 0;
      const sIqd = shipping_fees_iqd || 0;
      const oIqd = other_fees_iqd || 0;
      const totalCostIqd = pIqd + sIqd + oIqd;

      const newVehicle = await db.vehicle.create({
        data: {
          vin,
          make,
          model,
          year,
          color,
          colorAr: color_ar,
          lotNumber: lot_number,
          auctionSource: auction_source,
          purchasePriceUsd: purchase_price_usd || null,
          purchasePriceIqd: purchase_price_iqd || null,
          auctionFeesUsd: auction_fees_usd || null,
          shippingFeesUsd: shipping_fees_usd || null,
          shippingFeesIqd: shipping_fees_iqd || null,
          otherFeesUsd: other_fees_usd || null,
          otherFeesIqd: other_fees_iqd || null,
          totalCostUsd,
          totalCostIqd,
          currentStage: 'AUCTION_PURCHASED',
          userTrackingStage: 'PURCHASED',
          agentId: targetAgentId,
          customerId: customer_id || null,
          branchId: branch_id || null,
          status: status || 'active',
          notes,
          createdBy: user.id
        }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'vehicle_created',
        entityType: 'vehicle',
        entityId: newVehicle.id,
        newValue: newVehicle,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        data: newVehicle
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const vehicle = await db.vehicle.findUnique({
        where: { id }
      });

      if (!vehicle) {
        throw new AppError(404, 'NOT_FOUND', 'المركبة المطلوبة غير موجودة.');
      }

      // Enforce Data Scoping
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isAgent = user.role.name === 'senior_agent' || user.role.name === 'junior_agent' || user.role.level >= 4;

      if (isAgent && vehicle.agentId !== user.id) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تعديل بيانات هذه المركبة.');
      }

      const {
        vin,
        make,
        model,
        year,
        color,
        color_ar,
        lot_number,
        auction_source,
        purchase_price_usd,
        purchase_price_iqd,
        auction_fees_usd,
        shipping_fees_usd,
        shipping_fees_iqd,
        other_fees_usd,
        other_fees_iqd,
        customer_id,
        branch_id,
        agent_id,
        notes
      } = req.body;

      if (vin && vin !== vehicle.vin) {
        const checkVin = await db.vehicle.findUnique({ where: { vin } });
        if (checkVin) {
          throw new AppError(409, 'CONFLICT', 'رقم الهيكل VIN هذا مسجل بالفعل لسيارة أخرى.');
        }
      }

      let targetAgentId = vehicle.agentId;
      if (agent_id !== undefined && !isAgent) {
        targetAgentId = agent_id;
        // Verify agent exists
        const agentExists = await db.user.findUnique({ where: { id: targetAgentId } });
        if (!agentExists) {
          throw new AppError(404, 'AGENT_NOT_FOUND', 'الوكيل المحدد غير موجود.');
        }
      }

      // Recompute totals
      const pUsd = purchase_price_usd !== undefined ? (purchase_price_usd || 0) : (vehicle.purchasePriceUsd || 0);
      const aUsd = auction_fees_usd !== undefined ? (auction_fees_usd || 0) : (vehicle.auctionFeesUsd || 0);
      const sUsd = shipping_fees_usd !== undefined ? (shipping_fees_usd || 0) : (vehicle.shippingFeesUsd || 0);
      const oUsd = other_fees_usd !== undefined ? (other_fees_usd || 0) : (vehicle.otherFeesUsd || 0);
      const totalCostUsd = pUsd + aUsd + sUsd + oUsd;

      const pIqd = purchase_price_iqd !== undefined ? (purchase_price_iqd || 0) : (vehicle.purchasePriceIqd || 0);
      const sIqd = shipping_fees_iqd !== undefined ? (shipping_fees_iqd || 0) : (vehicle.shippingFeesIqd || 0);
      const oIqd = other_fees_iqd !== undefined ? (other_fees_iqd || 0) : (vehicle.otherFeesIqd || 0);
      const totalCostIqd = pIqd + sIqd + oIqd;

      const updatedVehicle = await db.vehicle.update({
        where: { id },
        data: {
          vin: vin !== undefined ? vin : vehicle.vin,
          make: make !== undefined ? make : vehicle.make,
          model: model !== undefined ? model : vehicle.model,
          year: year !== undefined ? year : vehicle.year,
          color: color !== undefined ? color : vehicle.color,
          colorAr: color_ar !== undefined ? color_ar : vehicle.colorAr,
          lotNumber: lot_number !== undefined ? lot_number : vehicle.lotNumber,
          auctionSource: auction_source !== undefined ? auction_source : vehicle.auctionSource,
          purchasePriceUsd: purchase_price_usd !== undefined ? purchase_price_usd : vehicle.purchasePriceUsd,
          purchasePriceIqd: purchase_price_iqd !== undefined ? purchase_price_iqd : vehicle.purchasePriceIqd,
          auctionFeesUsd: auction_fees_usd !== undefined ? auction_fees_usd : vehicle.auctionFeesUsd,
          shippingFeesUsd: shipping_fees_usd !== undefined ? shipping_fees_usd : vehicle.shippingFeesUsd,
          shippingFeesIqd: shipping_fees_iqd !== undefined ? shipping_fees_iqd : vehicle.shippingFeesIqd,
          otherFeesUsd: other_fees_usd !== undefined ? other_fees_usd : vehicle.otherFeesUsd,
          otherFeesIqd: other_fees_iqd !== undefined ? other_fees_iqd : vehicle.otherFeesIqd,
          totalCostUsd,
          totalCostIqd,
          agentId: targetAgentId,
          customerId: customer_id !== undefined ? customer_id : vehicle.customerId,
          branchId: branch_id !== undefined ? branch_id : vehicle.branchId,
          notes: notes !== undefined ? notes : vehicle.notes
        }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'vehicle_updated',
        entityType: 'vehicle',
        entityId: id,
        oldValue: vehicle,
        newValue: updatedVehicle,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: updatedVehicle
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleVehicleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      if (!status || !['active', 'delivered', 'archived', 'cancelled'].includes(status)) {
        throw new AppError(400, 'BAD_REQUEST', 'الحالة المطلوبة غير صالحة.');
      }

      // Check permissions: only Admins and Branch Managers can patch vehicle status
      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;

      if (!isSuperOrOps && !isBranchManager) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تعديل حالة المركبة.');
      }

      const vehicle = await db.vehicle.findUnique({
        where: { id },
        include: {
          agent: {
            select: { branchId: true }
          }
        }
      });

      if (!vehicle) {
        throw new AppError(404, 'NOT_FOUND', 'المركبة المطلوبة غير موجودة.');
      }

      // Branch Manager scoping
      if (isBranchManager && vehicle.agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تعديل حالة مركبات فروع أخرى.');
      }

      const updatedVehicle = await db.vehicle.update({
        where: { id },
        data: { status }
      });

      // Audit Log
      await logAction({
        userId: user.id,
        action: 'vehicle_status_changed',
        entityType: 'vehicle',
        entityId: id,
        oldValue: { status: vehicle.status },
        newValue: { status: updatedVehicle.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedVehicle.id,
          vin: updatedVehicle.vin,
          status: updatedVehicle.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
