import { Router } from 'express';
import { ClosureController } from '../controllers/closureController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import { createApprovalSchema, finalClosureSchema } from '../validators/sprint6.validators';

const router = Router();

// GET readiness status
router.get(
  '/:vehicleId/readiness',
  authenticate,
  requirePermission('vehicles', 'read'),
  ClosureController.getClosureReadiness
);

// GET approvals list
router.get(
  '/:vehicleId/approvals',
  authenticate,
  requirePermission('vehicles', 'read'),
  ClosureController.getApprovals
);

// POST create approval
router.post(
  '/:vehicleId/approvals',
  authenticate,
  requirePermission('vehicles', 'write'),
  (req, res, next) => {
    req.body.vehicle_id = req.params.vehicleId;
    next();
  },
  validateBody(createApprovalSchema),
  ClosureController.createApproval
);

// POST execute final closure
router.post(
  '/:vehicleId/execute',
  authenticate,
  requirePermission('vehicles', 'write'),
  (req, res, next) => {
    req.body.vehicle_id = req.params.vehicleId;
    next();
  },
  validateBody(finalClosureSchema),
  ClosureController.executeFinalClosure
);

export default router;
