import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import { createCustomerSchema, updateCustomerSchema } from '../validators/sprint3.validators';

const router = Router();

router.get('/', authenticate, requirePermission('customers', 'read'), CustomerController.getCustomers);
router.post('/', authenticate, requirePermission('customers', 'write'), validateBody(createCustomerSchema), CustomerController.createCustomer);
router.get('/:id', authenticate, requirePermission('customers', 'read'), CustomerController.getCustomer);
router.put('/:id', authenticate, requirePermission('customers', 'write'), validateBody(updateCustomerSchema), CustomerController.updateCustomer);
router.patch('/:id/status', authenticate, requirePermission('customers', 'write'), CustomerController.toggleCustomerStatus);

export default router;
