import { Router } from 'express';
import { CustomerPortalController } from '../controllers/customerPortalController';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET list of vehicles owned by customer
router.get('/vehicles', authenticate, CustomerPortalController.getVehicles);

// GET details of a specific vehicle
router.get('/vehicles/:id', authenticate, CustomerPortalController.getVehicleDetail);

// GET timeline of shipping stage transitions
router.get('/vehicles/:id/timeline', authenticate, CustomerPortalController.getTimeline);

// GET customer visible photos
router.get('/vehicles/:id/photos', authenticate, CustomerPortalController.getPhotos);

export default router;
