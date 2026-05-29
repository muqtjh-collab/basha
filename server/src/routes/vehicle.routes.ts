import { Router } from 'express';
import { VehicleController } from '../controllers/vehicleController';
import { StageController } from '../controllers/stageController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import { createVehicleSchema, updateVehicleSchema } from '../validators/sprint3.validators';
import { stageTransitionSchema } from '../validators/sprint4.validators';

const router = Router();

router.get('/', authenticate, requirePermission('vehicles', 'read'), VehicleController.getVehicles);
router.post('/', authenticate, requirePermission('vehicles', 'write'), validateBody(createVehicleSchema), VehicleController.createVehicle);
router.get('/:id', authenticate, requirePermission('vehicles', 'read'), VehicleController.getVehicle);
router.put('/:id', authenticate, requirePermission('vehicles', 'write'), validateBody(updateVehicleSchema), VehicleController.updateVehicle);
router.patch('/:id/status', authenticate, requirePermission('vehicles', 'write'), VehicleController.toggleVehicleStatus);

// Sprint 4: Stage transition routes
router.post('/:id/stage', authenticate, requirePermission('vehicles', 'write'), validateBody(stageTransitionSchema), StageController.transitionStage);
router.get('/:id/stages', authenticate, requirePermission('vehicles', 'read'), StageController.getStageHistory);

export default router;
