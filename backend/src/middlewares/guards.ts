import type { RequestHandler } from "express";
import { prisma } from "../infra/prisma";
import type { Role } from "@prisma/client";

// /user/:id -> self check or admin
export const requireSelfOrAdmin: RequestHandler = (req, res, next) => {
    const me = req.user!;
    const targetId = req.params.id;
    if (me.role === 'ADMIN' || me.id === targetId) return next();
    return res.status(403).json({ error: 'FORBBINDEN_SELF' });
};

export const requireOwnerPatientOrAdmin = (): RequestHandler => {
    return async (req, res, next) => {
        const me = req.user!;
        if (me.role === 'ADMIN') return next();

        const patientId = req.params.id ?? req.params.patientId;
        if(!patientId) return res.status(400).json({ error: 'PATIENT_ID_REQUIRED' });

        const p = await prisma?.patient.findUnique({ where: {id: patientId }, select: { ownerId: true }});
        if (!p) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });

        if(me.role === 'DOCTOR' && p.ownerId === me.id) return next();

        return res.status(403).json({ error: 'OWNER_REQUIRED' });
    };
};

export const requireOwnerAppointmentOrAdmin = (): RequestHandler => {
  return async (req, res, next) => {
    const me = req.user!;
    if (me.role === 'ADMIN') return next();

    const id = req.params.id;
    const a = await prisma.appointment.findUnique({ where: { id }, select: { doctorId: true } });
    if (!a) return res.status(404).json({ error: 'APPOINTMENT_NOT_FOUND' });

    if (me.role === 'DOCTOR' && a.doctorId === me.id) return next();
    return res.status(403).json({ error: 'OWNER_REQUIRED' });
  };
};

export const requireRole = (...roles: Role[]): RequestHandler => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'FORBIDDEN' });
};

// MAJ patient autorisée si ADMIN || SECRETARY || (DOCTOR owner)
export const requireOwnerPatientOrAdminOrSecretary: RequestHandler = async (req, res, next) => {
  const me = req.user!;
  if (me.role === 'ADMIN' || me.role === 'SECRETARY') return next();

  const patientId = req.params.id ?? req.params.patientId;
  if (!patientId) return res.status(400).json({ error: 'PATIENT_ID_REQUIRED' });

  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { ownerId: true } });
  if (!p) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });

  if (me.role === 'DOCTOR' && p.ownerId === me.id) return next();
  return res.status(403).json({ error: 'OWNER_REQUIRED' });
};