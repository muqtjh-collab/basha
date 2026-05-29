import { Router } from 'express';
import { BranchController } from '../controllers/branchController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import { createBranchSchema, updateBranchSchema } from '../validators/sprint3.validators';

const router = Router();

router.get('/', authenticate, requirePermission('branches', 'read'), BranchController.getBranches);
router.post('/', authenticate, requirePermission('branches', 'write'), validateBody(createBranchSchema), BranchController.createBranch);
router.get('/:id', authenticate, requirePermission('branches', 'read'), BranchController.getBranch);
router.put('/:id', authenticate, requirePermission('branches', 'write'), validateBody(updateBranchSchema), BranchController.updateBranch);
router.patch('/:id/status', authenticate, requirePermission('branches', 'write'), BranchController.toggleBranchStatus);
router.delete('/:id', authenticate, requirePermission('branches', 'write'), BranchController.deleteBranch);

export default router;
