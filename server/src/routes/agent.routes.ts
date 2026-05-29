import { Router } from 'express';
import { AgentController } from '../controllers/agentController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validation';
import { createAgentSchema, updateAgentSchema } from '../validators/sprint3.validators';

const router = Router();

router.get('/', authenticate, requirePermission('agents', 'read'), AgentController.getAgents);
router.post('/', authenticate, requirePermission('agents', 'write'), validateBody(createAgentSchema), AgentController.createAgent);
router.get('/:id', authenticate, requirePermission('agents', 'read'), AgentController.getAgent);
router.put('/:id', authenticate, requirePermission('agents', 'write'), validateBody(updateAgentSchema), AgentController.updateAgent);
router.patch('/:id/status', authenticate, requirePermission('agents', 'write'), AgentController.toggleAgentStatus);

export default router;
