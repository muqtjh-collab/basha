-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'wallet_balance_added';
ALTER TYPE "AuditAction" ADD VALUE 'wallet_balance_deducted';
ALTER TYPE "AuditAction" ADD VALUE 'wallet_deduction_rejected';
