import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from '../services/auditService';
import { validateTransition, STAGE_TO_USER_TRACKING, STAGE_SEQUENCE } from '../services/stageService';
import { VehicleStage, AuditAction } from '@prisma/client';

export class StageController {
  /**
   * POST /api/vehicles/:id/stage
   * Transitions a vehicle to a new stage.
   * Requires: vehicles.write permission (enforced by RBAC middleware)
   * Accessible to: super_admin, operations_manager, branch_manager
   */
  static async transitionStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      // Only super_admin, operations_manager, branch_manager may transition stages
      const isSuperAdmin = user.role.name === 'super_admin' || user.role.level === 1;
      const isSuperOrOps = isSuperAdmin || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;
      const isAgent = user.role.level >= 4;

      if (isAgent) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
      }

      const { to_stage, note } = req.body as { to_stage: string; note?: string };

      // Validate to_stage is a known value
      if (!STAGE_SEQUENCE.includes(to_stage as VehicleStage)) {
        throw new AppError(400, 'BAD_REQUEST', 'قيمة المرحلة غير صحيحة.');
      }

      const toStage = to_stage as VehicleStage;

      // Load vehicle with agent for scope enforcement
      const vehicle = await db.vehicle.findUnique({
        where: { id },
        include: {
          agent: {
            select: { id: true, branchId: true, fullNameAr: true }
          }
        }
      });

      if (!vehicle) {
        throw new AppError(404, 'NOT_FOUND', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }

      // Enforce data scoping for branch managers
      if (isBranchManager && vehicle.agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
      }

      const fromStage = vehicle.currentStage;

      // Validate transition sequence
      const validation = validateTransition(fromStage, toStage, isSuperAdmin);

      if (!validation.valid) {
        // Log the rejected attempt to audit log (fire-and-forget, must not block)
        try {
          await AuditService.logAction({
            userId: user.id,
            action: 'stage_transition_rejected' as AuditAction,
            entityType: 'vehicle',
            entityId: id,
            oldValue: { from_stage: fromStage, to_stage: toStage, reason: (validation as any).reason },
            newValue: null,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] as string
          });
        } catch (auditErr) {
          console.error('❌ Failed to write rejected stage transition audit log:', auditErr);
        }

        throw new AppError(
          400,
          'INVALID_TRANSITION',
          'لا يمكن تغيير الحالة إلى هذه المرحلة. يرجى المتابعة بالترتيب الصحيح.'
        );
      }

      const newUserTrackingStage = STAGE_TO_USER_TRACKING[toStage];

      // Build the note — for super_admin override, append indicator
      let finalNote = note || null;
      if (isSuperAdmin && STAGE_SEQUENCE.indexOf(toStage) !== STAGE_SEQUENCE.indexOf(fromStage) + 1) {
        const overrideIndicator = `[تجاوز إداري: super_admin]`;
        finalNote = note ? `${overrideIndicator} ${note}` : overrideIndicator;
      }

      // Execute within a single transaction
      const updatedVehicle = await db.$transaction(async (tx) => {
        // 1. Update vehicle current_stage and user_tracking_stage
        const updated = await tx.vehicle.update({
          where: { id },
          data: {
            currentStage: toStage,
            userTrackingStage: newUserTrackingStage
          }
        });

        // 2. Create stage transition record
        await tx.vehicleStageTransition.create({
          data: {
            vehicleId: id,
            fromStage: fromStage,
            toStage: toStage,
            transitionedBy: user.id,
            notes: finalNote
          }
        });

        // 3. Log audit within transaction
        try {
          await AuditService.logAction(
            {
              userId: user.id,
              action: 'stage_transition_completed' as AuditAction,
              entityType: 'vehicle',
              entityId: id,
              oldValue: { stage: fromStage, user_tracking_stage: vehicle.userTrackingStage },
              newValue: { stage: toStage, user_tracking_stage: newUserTrackingStage, note: finalNote },
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'] as string
            },
            tx
          );
        } catch (auditErr) {
          // Must not interrupt the main transaction
          console.error('❌ Failed to write stage transition audit log:', auditErr);
        }

        return updated;
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedVehicle.id,
          vin: updatedVehicle.vin,
          current_stage: updatedVehicle.currentStage,
          user_tracking_stage: updatedVehicle.userTrackingStage,
          updated_at: updatedVehicle.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicles/:id/stages
   * Returns the full stage history for a vehicle.
   * Requires: vehicles.read permission
   * Accessible to: super_admin, operations_manager, branch_manager, senior_agent (own vehicles)
   */
  static async getStageHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const isSuperOrOps = user.role.name === 'super_admin' || user.role.name === 'operations_manager' || user.role.level <= 2;
      const isBranchManager = user.role.name === 'branch_manager' || user.role.level === 3;
      const isAgent = user.role.level >= 4;

      // Load vehicle to enforce scoping
      const vehicle = await db.vehicle.findUnique({
        where: { id },
        include: {
          agent: {
            select: { id: true, branchId: true }
          }
        }
      });

      if (!vehicle) {
        throw new AppError(404, 'NOT_FOUND', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }

      // Agent scope: can only access own vehicles
      if (isAgent && vehicle.agentId !== user.id) {
        throw new AppError(403, 'FORBIDDEN', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }

      // Branch manager scope
      if (isBranchManager && vehicle.agent.branchId !== user.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }

      const transitions = await db.vehicleStageTransition.findMany({
        where: { vehicleId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              fullNameAr: true
            }
          }
        }
      });

      const formattedTransitions = transitions.map(t => ({
        id: t.id,
        from_stage: t.fromStage,
        to_stage: t.toStage,
        note: t.notes,
        created_at: t.createdAt,
        transitioned_by: t.user ? {
          id: t.user.id,
          full_name: t.user.fullName,
          full_name_ar: t.user.fullNameAr
        } : null
      }));

      res.status(200).json({
        success: true,
        data: formattedTransitions
      });
    } catch (error) {
      next(error);
    }
  }
}
