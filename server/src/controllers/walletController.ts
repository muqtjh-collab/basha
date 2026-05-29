import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { WalletService } from '../services/walletService';

export class WalletController {
  /**
   * Get wallet by Agent ID
   */
  static async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      const wallet = await WalletService.getWalletByAgentId(agentId, user);

      res.status(200).json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transactions of an agent's wallet
   */
  static async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      // First fetch the wallet of this agent to get its ID (this also verifies data scoping)
      const wallet = await WalletService.getWalletByAgentId(agentId, user);

      // Extract filters
      const filters = {
        type: req.query.type,
        currency: req.query.currency,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        page: req.query.page,
        limit: req.query.limit,
      };

      const result = await WalletService.getWalletTransactions(wallet.id, user, filters);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deposit balance to agent's wallet
   */
  static async deposit(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      // Route-level and controller-level security check: Only super_admin and operations_manager
      const roleName = user.role.name;
      if (roleName !== 'super_admin' && roleName !== 'operations_manager' && user.role.level > 2) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
      }

      // Find the agent's wallet
      const wallet = await db.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) {
        throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }

      const { amount, currency, description, description_ar, reference_type, reference_id } = req.body;

      const updatedWallet = await WalletService.addBalance(
        wallet.id,
        amount,
        currency,
        description,
        description_ar,
        user.id,
        reference_type,
        reference_id
      );

      res.status(200).json({
        success: true,
        data: updatedWallet,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deduct balance from agent's wallet
   */
  static async deduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = req.params;
      const user = req.user;
      if (!user) {
        throw new AppError(401, 'UNAUTHORIZED', 'عذراً، يجب تسجيل الدخول للوصول إلى هذا المورد.');
      }

      // Route-level and controller-level security check: Only super_admin and operations_manager
      const roleName = user.role.name;
      if (roleName !== 'super_admin' && roleName !== 'operations_manager' && user.role.level > 2) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
      }

      // Find the agent's wallet
      const wallet = await db.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) {
        throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }

      const { amount, currency, description, description_ar, reference_type, reference_id } = req.body;

      const updatedWallet = await WalletService.deductBalance(
        wallet.id,
        amount,
        currency,
        description,
        description_ar,
        user.id,
        reference_type,
        reference_id
      );

      res.status(200).json({
        success: true,
        data: updatedWallet,
      });
    } catch (error) {
      next(error);
    }
  }
}
