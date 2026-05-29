import { Request, Response, NextFunction } from 'express';
import { ClosureService } from '../services/closureService';
import { AppError } from '../middleware/errorHandler';

export class ClosureController {
  /**
   * Get closure readiness and status for a vehicle
   */
  static async getClosureReadiness(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const readiness = await ClosureService.getClosureReadiness(vehicleId, user);

      res.status(200).json({
        success: true,
        data: readiness,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all approvals registered for a vehicle
   */
  static async getApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const readiness = await ClosureService.getClosureReadiness(vehicleId, user);

      res.status(200).json({
        success: true,
        data: readiness.existing_approvals,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create an internal approval for a vehicle
   */
  static async createApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const { approval_type, note } = req.body;

      const approval = await ClosureService.createApproval(
        vehicleId,
        approval_type,
        user.id,
        note,
        user
      );

      res.status(201).json({
        success: true,
        data: approval,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute final closure for a vehicle
   */
  static async executeFinalClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const { vehicleId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const vehicle = await ClosureService.executeFinalClosure(vehicleId, user.id, user);

      res.status(200).json({
        success: true,
        data: vehicle,
      });
    } catch (error) {
      if (error instanceof AppError && error.code === 'BAD_REQUEST' && error.messageAr === 'لا يمكن إغلاق المركبة. توجد متطلبات غير مكتملة.') {
        const reqs = (error as any).missing_requirements || [];
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message_ar: error.messageAr,
            details: reqs,
            missing_requirements: reqs,
          },
          missing_requirements: reqs,
        });
      }
      next(error);
    }
  }
}
