-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('finance', 'operations', 'administration');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'closure_approval_created';
ALTER TYPE "AuditAction" ADD VALUE 'closure_approval_duplicate_rejected';
ALTER TYPE "AuditAction" ADD VALUE 'final_closure_completed';
ALTER TYPE "AuditAction" ADD VALUE 'final_closure_rejected';

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by" UUID,
ADD COLUMN     "is_closed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "internal_approvals" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "approval_type" "ApprovalType" NOT NULL,
    "approved_by" UUID NOT NULL,
    "approved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_approvals_vehicle_id_approval_type_key" ON "internal_approvals"("vehicle_id", "approval_type");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_approvals" ADD CONSTRAINT "internal_approvals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_approvals" ADD CONSTRAINT "internal_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
