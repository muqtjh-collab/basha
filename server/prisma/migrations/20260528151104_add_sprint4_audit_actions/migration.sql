-- AlterEnum
-- Sprint 4: Add stage transition audit actions

ALTER TYPE "AuditAction" ADD VALUE 'stage_transition_completed';
ALTER TYPE "AuditAction" ADD VALUE 'stage_transition_rejected';