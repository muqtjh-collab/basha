import { Router } from 'express';
import { RoleController } from '../controllers/roleController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, requirePermission('roles', 'read'), RoleController.getRoles);
router.post('/', authenticate, requirePermission('roles', 'write'), RoleController.createRole);
router.get('/:id', authenticate, requirePermission('roles', 'read'), RoleController.getRole);
router.put('/:id', authenticate, requirePermission('roles', 'write'), RoleController.updateRole);
router.delete('/:id', authenticate, requirePermission('roles', 'delete'), RoleController.deleteRole);
router.get('/:id/users', authenticate, requirePermission('roles', 'read'), RoleController.getRoleUsers);

export default router;
