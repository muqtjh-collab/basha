import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from './auditService';
import { Currency, Prisma } from '@prisma/client';

export class WalletService {
  /**
   * Get wallet by agent ID with strict RBAC scoping
   */
  static async getWalletByAgentId(agentId: string, requestingUser: any) {
    const roleName = requestingUser.role.name;

    // Fetch the wallet along with agent details to check branch scoping
    const wallet = await db.wallet.findUnique({
      where: { agentId },
      include: {
        agent: {
          select: {
            id: true,
            branchId: true,
            status: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!wallet) {
      throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    // Apply data scoping
    // super_admin, operations_manager: any wallet
    if (roleName === 'super_admin' || roleName === 'operations_manager' || requestingUser.role.level <= 2) {
      // Allowed
    } else if (roleName === 'branch_manager' || requestingUser.role.level === 3) {
      // branch_manager: only wallets of agents in own branch
      if (!requestingUser.branchId || wallet.agent.branchId !== requestingUser.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }
    } else if (roleName === 'senior_agent' || roleName === 'junior_agent' || requestingUser.role.level >= 4) {
      // senior_agent, junior_agent: only own wallet
      if (agentId !== requestingUser.id) {
        throw new AppError(403, 'FORBIDDEN', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }
    } else {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
    }

    return {
      id: wallet.id,
      agent_id: wallet.agentId,
      balance_usd: wallet.balanceUsd,
      balance_iqd: wallet.balanceIqd,
      status: wallet.status,
      updated_at: wallet.updatedAt,
    };
  }

  /**
   * Get wallet transaction history with pagination, filters, and RBAC scoping
   */
  static async getWalletTransactions(walletId: string, requestingUser: any, filters: any) {
    const roleName = requestingUser.role.name;

    // Fetch the wallet to perform the scoping checks
    const wallet = await db.wallet.findUnique({
      where: { id: walletId },
      include: {
        agent: {
          select: {
            id: true,
            branchId: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }

    // Apply data scoping (same as getWalletByAgentId)
    if (roleName === 'super_admin' || roleName === 'operations_manager' || requestingUser.role.level <= 2) {
      // Allowed
    } else if (roleName === 'branch_manager' || requestingUser.role.level === 3) {
      if (!requestingUser.branchId || wallet.agent.branchId !== requestingUser.branchId) {
        throw new AppError(403, 'FORBIDDEN', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }
    } else if (roleName === 'senior_agent' || roleName === 'junior_agent' || requestingUser.role.level >= 4) {
      if (wallet.agentId !== requestingUser.id) {
        throw new AppError(403, 'FORBIDDEN', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }
    } else {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
    }

    // Build filter criteria
    const whereClause: any = {
      walletId,
    };

    if (filters.type) {
      whereClause.type = filters.type;
    }
    if (filters.currency) {
      whereClause.currency = filters.currency as Currency;
    }
    if (filters.date_from || filters.date_to) {
      whereClause.createdAt = {};
      if (filters.date_from) {
        whereClause.createdAt.gte = new Date(filters.date_from);
      }
      if (filters.date_to) {
        whereClause.createdAt.lte = new Date(filters.date_to);
      }
    }

    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.walletTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          performer: {
            select: {
              fullName: true,
              fullNameAr: true,
            },
          },
        },
      }),
      db.walletTransaction.count({ where: whereClause }),
    ]);

    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      wallet_id: tx.walletId,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      description_ar: tx.descriptionAr,
      reference_type: tx.referenceType,
      reference_id: tx.referenceId,
      performed_by: tx.performedBy,
      created_at: tx.createdAt,
      performer: tx.performer ? {
        full_name: tx.performer.fullName,
        full_name_ar: tx.performer.fullNameAr,
      } : null,
    }));

    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      transactions: formattedTransactions,
    };
  }

  /**
   * Add balance (deposit) to wallet
   */
  static async addBalance(
    walletId: string,
    amount: number,
    currency: 'USD' | 'IQD',
    description: string,
    descriptionAr: string,
    performedBy: string,
    referenceType?: string,
    referenceId?: string
  ) {
    // Validation checks
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'يجب أن يكون المبلغ رقماً صحيحاً أكبر من الصفر.');
    }
    if (currency !== 'USD' && currency !== 'IQD') {
      throw new AppError(400, 'INVALID_CURRENCY', 'العملة غير صحيحة. يُقبل فقط USD أو IQD.');
    }
    if (!description || !descriptionAr || description.trim() === '' || descriptionAr.trim() === '') {
      throw new AppError(400, 'DESCRIPTION_REQUIRED', 'وصف العملية مطلوب.');
    }

    const updatedWallet = await db.$transaction(async (tx) => {
      // 1. Get and verify wallet status
      const currentWallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!currentWallet) {
        throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }
      if (currentWallet.status === 'frozen') {
        throw new AppError(400, 'WALLET_FROZEN', 'هذه المحفظة موقوفة مؤقتاً. يرجى التواصل مع الإدارة.');
      }

      // 2. Increment balance_usd (if USD) or balance_iqd (if IQD) on the wallet record
      const balanceField = currency === 'USD' ? 'balanceUsd' : 'balanceIqd';
      const wallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          [balanceField]: {
            increment: amount,
          },
        },
      });

      // 3. Create a wallet_transactions record
      await tx.walletTransaction.create({
        data: {
          walletId,
          type: 'deposit',
          amount: amount, // Positive for deposits
          currency,
          description,
          descriptionAr,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          performedBy,
        },
      });

      return wallet;
    });

    // 4. Audit logging after commit (non-blocking)
    try {
      const balanceAfter = currency === 'USD' ? updatedWallet.balanceUsd : updatedWallet.balanceIqd;
      await AuditService.logAction({
        userId: performedBy,
        action: 'wallet_balance_added',
        entityType: 'wallet',
        entityId: walletId,
        newValue: { amount, currency, balance_after: balanceAfter },
      });
    } catch (auditError) {
      console.error('❌ Failed to log audit action for addBalance:', auditError);
    }

    return {
      id: updatedWallet.id,
      agent_id: updatedWallet.agentId,
      balance_usd: updatedWallet.balanceUsd,
      balance_iqd: updatedWallet.balanceIqd,
      status: updatedWallet.status,
      updated_at: updatedWallet.updatedAt,
    };
  }

  /**
   * Deduct balance from wallet
   */
  static async deductBalance(
    walletId: string,
    amount: number,
    currency: 'USD' | 'IQD',
    description: string,
    descriptionAr: string,
    performedBy: string,
    referenceType?: string,
    referenceId?: string
  ) {
    // Validation checks
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'يجب أن يكون المبلغ رقماً صحيحاً أكبر من الصفر.');
    }
    if (currency !== 'USD' && currency !== 'IQD') {
      throw new AppError(400, 'INVALID_CURRENCY', 'العملة غير صحيحة. يُقبل فقط USD أو IQD.');
    }
    if (!description || !descriptionAr || description.trim() === '' || descriptionAr.trim() === '') {
      throw new AppError(400, 'DESCRIPTION_REQUIRED', 'وصف العملية مطلوب.');
    }

    // Pre-check balance before opening database transaction
    const wallet = await db.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
    }
    if (wallet.status === 'frozen') {
      throw new AppError(400, 'WALLET_FROZEN', 'هذه المحفظة موقوفة مؤقتاً. يرجى التواصل مع الإدارة.');
    }

    const currentBalance = currency === 'USD' ? wallet.balanceUsd : wallet.balanceIqd;
    if (currentBalance < amount) {
      // Insufficient balance, reject immediately and write audit log
      try {
        await AuditService.logAction({
          userId: performedBy,
          action: 'wallet_deduction_rejected',
          entityType: 'wallet',
          entityId: walletId,
          newValue: {
            attempted_amount: amount,
            currency,
            current_balance: currentBalance,
            reason: 'insufficient_balance',
          },
        });
      } catch (auditError) {
        console.error('❌ Failed to log audit action for wallet_deduction_rejected:', auditError);
      }
      throw new AppError(400, 'INSUFFICIENT_BALANCE', 'الرصيد غير كافٍ لإتمام عملية الخصم.');
    }

    // Execute deduction within database transaction
    const updatedWallet = await db.$transaction(async (tx) => {
      // Fetch again inside transaction for lock and check
      const txWallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!txWallet) {
        throw new AppError(404, 'WALLET_NOT_FOUND', 'المحفظة غير موجودة أو لا تملك صلاحية الوصول إليها.');
      }
      if (txWallet.status === 'frozen') {
        throw new AppError(400, 'WALLET_FROZEN', 'هذه المحفظة موقوفة مؤقتاً. يرجى التواصل مع الإدارة.');
      }

      const txBalance = currency === 'USD' ? txWallet.balanceUsd : txWallet.balanceIqd;
      if (txBalance < amount) {
        throw new AppError(400, 'INSUFFICIENT_BALANCE', 'الرصيد غير كافٍ لإتمام عملية الخصم.');
      }

      const balanceField = currency === 'USD' ? 'balanceUsd' : 'balanceIqd';

      // 1. Decrement balance
      const updated = await tx.wallet.update({
        where: { id: walletId },
        data: {
          [balanceField]: {
            decrement: amount,
          },
        },
      });

      // 2. Safety guard: verify resulting balance is >= 0
      const resultingBalance = currency === 'USD' ? updated.balanceUsd : updated.balanceIqd;
      if (resultingBalance < 0) {
        throw new Error('Database integrity check failed: Negative balance detected.');
      }

      // 3. Create a wallet_transactions record
      await tx.walletTransaction.create({
        data: {
          walletId,
          type: 'deduction',
          amount: -amount, // Stored as negative for deductions according to schema description
          currency,
          description,
          descriptionAr,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          performedBy,
        },
      });

      return updated;
    });

    // 4. Audit logging after commit (non-blocking)
    try {
      const balanceAfter = currency === 'USD' ? updatedWallet.balanceUsd : updatedWallet.balanceIqd;
      await AuditService.logAction({
        userId: performedBy,
        action: 'wallet_balance_deducted',
        entityType: 'wallet',
        entityId: walletId,
        newValue: { amount, currency, balance_after: balanceAfter },
      });
    } catch (auditError) {
      console.error('❌ Failed to log audit action for deductBalance:', auditError);
    }

    return {
      id: updatedWallet.id,
      agent_id: updatedWallet.agentId,
      balance_usd: updatedWallet.balanceUsd,
      balance_iqd: updatedWallet.balanceIqd,
      status: updatedWallet.status,
      updated_at: updatedWallet.updatedAt,
    };
  }
}
