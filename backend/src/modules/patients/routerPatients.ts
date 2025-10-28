import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler';
import { authAccess } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac';
import { getPatients, getPatientById, postPatient, putPatient, delPatient } from './controllerPatients';

const r = Router();

// Tous loggés -> lecture
r.get('/', authAccess, asyncHandler(getPatients));
r.get('/:id', authAccess, asyncHandler(getPatientById));

// Ecriture (ADMIN/DOCTOR/SECRETARY via RBAC)
r.post('/', authAccess, rbac('PATIENT_WRITE'), asyncHandler(postPatient));
r.put('/:id', authAccess, rbac('PATIENT_WRITE'), asyncHandler(putPatient));

// Suppression (ADMIN + owner doctor via service; route protégée par RBAC)
r.delete('/:id', authAccess, rbac('PATIENT_DELETE'), asyncHandler(delPatient));

export default r;