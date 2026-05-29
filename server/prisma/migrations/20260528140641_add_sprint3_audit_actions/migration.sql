-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'branch_created';
ALTER TYPE "AuditAction" ADD VALUE 'branch_updated';
ALTER TYPE "AuditAction" ADD VALUE 'branch_status_changed';
ALTER TYPE "AuditAction" ADD VALUE 'branch_deleted';
ALTER TYPE "AuditAction" ADD VALUE 'customer_created';
ALTER TYPE "AuditAction" ADD VALUE 'customer_updated';
ALTER TYPE "AuditAction" ADD VALUE 'customer_status_changed';
ALTER TYPE "AuditAction" ADD VALUE 'agent_created';
ALTER TYPE "AuditAction" ADD VALUE 'agent_updated';
ALTER TYPE "AuditAction" ADD VALUE 'agent_status_changed';
ALTER TYPE "AuditAction" ADD VALUE 'vehicle_created';
ALTER TYPE "AuditAction" ADD VALUE 'vehicle_updated';
ALTER TYPE "AuditAction" ADD VALUE 'vehicle_status_changed';
