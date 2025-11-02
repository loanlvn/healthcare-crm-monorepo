import { Router } from 'express';
import { rbac } from '../../middlewares/rbac';
import { requireSelfOrAdmin } from '../../middlewares/guards'; 
import * as ctrl from './controllerDoctors';

const r = Router();

r.get('/specialties', ctrl.getSpecialties);
r.get('/', ctrl.getDoctors);
r.get('/:id', requireSelfOrAdmin, ctrl.getDoctorProfile);

r.put('/:id/profile', requireSelfOrAdmin, ctrl.putDoctorProfile);
r.put('/me/profile', ctrl.putMyDoctorProfile);

export default r;
