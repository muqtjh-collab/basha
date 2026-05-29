import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import { depositSchema, deductSchema } from '../validators/sprint5.validators';

const router = Router();

// Retrieve wallet balances and status
router.get(
  '/:agentId',
  authenticate,
  requirePermission('wallets', 'read'),
  WalletController.getWallet
);

// Retrieve wallet transaction history
router.get(
  '/:agentId/transactions',
  authenticate,
  requirePermission('wallets', 'read'),
  WalletController.getTransactions
);

// Deposit balance (super_admin and operations_manager only)
router.post(
  '/:agentId/deposit',
  authenticate,
  requirePermission('wallets', 'write'),
  validateBody(depositSchema),
  WalletController.deposit
);

// Deduct balance (super_admin and operations_manager only)
router.post(
  '/:agentId/deduct',
  authenticate,
  requirePermission('wallets', 'write'),
  validateBody(deductSchema),
  WalletController.deduct
);

export default router;
