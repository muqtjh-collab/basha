import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from './auditService';
import { VehicleStage, AuditAction, ApprovalType } from '@prisma/client';

export class ClosureService {
  /**
   * Evaluates the closure readiness of a vehicle.
   */
  static async getClosureReadiness(vehicleId: string, requestingUser: any) {
    // 1. Fetch vehicle with agent and approvals
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        agent: {
          select: {
            id: true,
            branchId: true,
          },
        },
        internalApprovals: {
          include: {
            approver: {
              select: {
                id: true,
                fullName: true,
                fullNameAr: true,
              },
            },
          },
        },
      },
    });

    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    // Enforce data scoping
    const isSuperOrOps =
      requestingUser.role.name === 'super_admin' ||
      requestingUser.role.name === 'operations_manager' ||
      requestingUser.role.level <= 2;
    const isBranchManager =
      requestingUser.role.name === 'branch_manager' ||
      requestingUser.role.level === 3;

    if (!isSuperOrOps && !isBranchManager) {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
    }

    if (isBranchManager && vehicle.agent.branchId !== requestingUser.branchId) {
      throw new AppError(403, 'FORBIDDEN', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    const approvals = vehicle.internalApprovals.map((app) => ({
      id: app.id,
      vehicle_id: app.vehicleId,
      approval_type: app.approvalType,
      approved_by: app.approvedBy,
      approved_at: app.approvedAt,
      note: app.note,
      created_at: app.createdAt,
      approver: app.approver
        ? {
            id: app.approver.id,
            full_name: app.approver.fullName,
            full_name_ar: app.approver.fullNameAr,
          }
        : null,
    }));

    // If already closed, return status immediately
    if (vehicle.isClosed) {
      return {
        vehicle_id: vehicle.id,
        is_ready: false,
        is_already_closed: true,
        missing_requirements: [],
        existing_approvals: approvals,
        current_stage: vehicle.currentStage,
      };
    }

    const missingRequirements: string[] = [];

    // Check 2: Stage check
    const allowedStages: VehicleStage[] = ['FINAL_DELIVERY', 'POST_DELIVERY_ARCHIVE'];
    if (!allowedStages.includes(vehicle.currentStage)) {
      missingRequirements.push('لم تصل المركبة إلى مرحلة التسليم النهائي بعد.');
    }

    // Check 3: Finance approval
    const hasFinance = vehicle.internalApprovals.some((a) => a.approvalType === 'finance');
    if (!hasFinance) {
      missingRequirements.push('الموافقة المالية مطلوبة ولم تُسجَّل بعد.');
    }

    // Check 4: Operations approval
    const hasOperations = vehicle.internalApprovals.some((a) => a.approvalType === 'operations');
    if (!hasOperations) {
      missingRequirements.push('موافقة العمليات مطلوبة ولم تُسجَّل بعد.');
    }

    // Check 5: Administration approval
    const hasAdministration = vehicle.internalApprovals.some((a) => a.approvalType === 'administration');
    if (!hasAdministration) {
      missingRequirements.push('موافقة الإدارة مطلوبة ولم تُسجَّل بعد.');
    }

    const isReady = missingRequirements.length === 0;

    return {
      vehicle_id: vehicle.id,
      is_ready: isReady,
      is_already_closed: false,
      missing_requirements: missingRequirements,
      existing_approvals: approvals,
      current_stage: vehicle.currentStage,
    };
  }

  /**
   * Registers a new internal approval record for a vehicle.
   */
  static async createApproval(
    vehicleId: string,
    approvalType: 'finance' | 'operations' | 'administration',
    performedBy: string,
    note?: string,
    requestingUser?: any
  ) {
    // 1. Load vehicle & check scope
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        agent: {
          select: {
            id: true,
            branchId: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    const isSuperOrOps =
      requestingUser.role.name === 'super_admin' ||
      requestingUser.role.name === 'operations_manager' ||
      requestingUser.role.level <= 2;
    const isBranchManager =
      requestingUser.role.name === 'branch_manager' ||
      requestingUser.role.level === 3;

    if (!isSuperOrOps && !isBranchManager) {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الصفحة.');
    }

    if (isBranchManager && vehicle.agent.branchId !== requestingUser.branchId) {
      throw new AppError(403, 'FORBIDDEN', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    // 2. Check if already closed
    if (vehicle.isClosed) {
      throw new AppError(400, 'BAD_REQUEST', 'تم إغلاق هذه المركبة مسبقاً.');
    }

    // 3. Role authorization mapping per type
    const roleName = requestingUser.role.name;
    let isAuthorized = false;

    if (approvalType === 'finance') {
      isAuthorized = roleName === 'super_admin' || roleName === 'operations_manager';
    } else if (approvalType === 'operations') {
      isAuthorized =
        roleName === 'super_admin' ||
        roleName === 'operations_manager' ||
        roleName === 'branch_manager';
    } else if (approvalType === 'administration') {
      isAuthorized = roleName === 'super_admin';
    }

    if (!isAuthorized) {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
    }

    // 4. Duplicate check
    const existingApproval = await db.internalApproval.findUnique({
      where: {
        vehicleId_approvalType: {
          vehicleId,
          approvalType: approvalType as ApprovalType,
        },
      },
    });

    if (existingApproval) {
      // Log rejected duplicate attempt to audit log (outside transaction to persist)
      try {
        await AuditService.logAction({
          userId: performedBy,
          action: 'closure_approval_duplicate_rejected' as AuditAction,
          entityType: 'vehicle',
          entityId: vehicleId,
          oldValue: null,
          newValue: { approval_type: approvalType, attempted_by: performedBy },
        });
      } catch (err) {
        console.error('❌ Failed to log duplicate approval rejection:', err);
      }

      throw new AppError(400, 'BAD_REQUEST', 'تم تسجيل هذه الموافقة مسبقاً لهذه المركبة.');
    }

    // 5. Note character validation
    if (note && note.length > 500) {
      throw new AppError(400, 'BAD_REQUEST', 'الملاحظة يجب ألا تتجاوز 500 حرف.');
    }

    // 6. Execute approval creation inside database transaction
    return await db.$transaction(async (tx) => {
      const approval = await tx.internalApproval.create({
        data: {
          vehicleId,
          approvalType: approvalType as ApprovalType,
          approvedBy: performedBy,
          note: note || null,
          approvedAt: new Date(),
        },
      });

      try {
        await AuditService.logAction(
          {
            userId: performedBy,
            action: 'closure_approval_created' as AuditAction,
            entityType: 'vehicle',
            entityId: vehicleId,
            oldValue: null,
            newValue: { approval_type: approvalType, approved_by: performedBy },
          },
          tx
        );
      } catch (err) {
        console.error('❌ Failed to log approval creation:', err);
      }

      return approval;
    });
  }

  /**
   * Finalizes closure of a vehicle.
   */
  static async executeFinalClosure(vehicleId: string, performedBy: string, requestingUser: any) {
    // 1. Enforce super_admin only check
    const isSuperAdmin =
      requestingUser.role.name === 'super_admin' || requestingUser.role.level === 1;
    if (!isSuperAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
    }

    // 2. Fetch readiness state
    const readiness = await this.getClosureReadiness(vehicleId, requestingUser);

    if (readiness.is_already_closed) {
      throw new AppError(400, 'BAD_REQUEST', 'تم إغلاق هذه المركبة مسبقاً.');
    }

    // If not ready, record rejected closure and return error
    if (!readiness.is_ready) {
      try {
        await AuditService.logAction({
          userId: performedBy,
          action: 'final_closure_rejected' as AuditAction,
          entityType: 'vehicle',
          entityId: vehicleId,
          oldValue: null,
          newValue: {
            attempted_by: performedBy,
            missing_requirements: readiness.missing_requirements,
          },
        });
      } catch (err) {
        console.error('❌ Failed to log closure rejection:', err);
      }

      const error = new AppError(400, 'BAD_REQUEST', 'لا يمكن إغلاق المركبة. توجد متطلبات غير مكتملة.');
      (error as any).missing_requirements = readiness.missing_requirements;
      throw error;
    }

    // 3. Load vehicle before transaction
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new AppError(404, 'NOT_FOUND', 'المركبة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    const fromStage = vehicle.currentStage;
    const now = new Date();

    // 4. Run mutations inside a single database transaction
    return await db.$transaction(async (tx) => {
      // Step A: Update vehicle closure columns
      const updatedVehicle = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          isClosed: true,
          closedAt: now,
          closedBy: performedBy,
          currentStage: 'POST_DELIVERY_ARCHIVE',
          userTrackingStage: 'DELIVERED',
        },
      });

      // Step B: Record stage transition if applicable
      if (fromStage !== 'POST_DELIVERY_ARCHIVE') {
        await tx.vehicleStageTransition.create({
          data: {
            vehicleId,
            fromStage: fromStage,
            toStage: 'POST_DELIVERY_ARCHIVE',
            transitionedBy: performedBy,
            notes: 'إغلاق نهائي للمركبة',
          },
        });
      }

      // Step C: Write audit log inside transaction
      try {
        await AuditService.logAction(
          {
            userId: performedBy,
            action: 'final_closure_completed' as AuditAction,
            entityType: 'vehicle',
            entityId: vehicleId,
            oldValue: { is_closed: false, current_stage: fromStage },
            newValue: { is_closed: true, closed_at: now, closed_by: performedBy, current_stage: 'POST_DELIVERY_ARCHIVE' },
          },
          tx
        );
      } catch (err) {
        console.error('❌ Failed to log final closure completion:', err);
      }

      return updatedVehicle;
    });
  }
}
