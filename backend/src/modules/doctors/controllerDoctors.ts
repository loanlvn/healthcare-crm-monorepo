// modules/doctors/controllerDoctors.ts
import { Request, Response } from 'express';
import { listDoctorsQuerySchema, upsertProfileSchema } from './dto';
import * as svc from './serviceDoctor';

export async function getDoctors(req: Request, res: Response) {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'SECRETARY') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  const q = listDoctorsQuerySchema.parse(req.query);
  const out = await svc.listDoctorsPaged(q);
  res.json(out);
}

export async function getDoctorProfile(req: Request, res: Response) {
  const out = await svc.getDoctorProfile(req.params.id);
  res.json(out);
}

export async function putDoctorProfile(req: Request, res: Response) {
  const body = upsertProfileSchema.parse(req.body);
  const updated = await svc.upsertDoctorProfile(req.user!, req.params.id, body);
  res.json(updated); 
}

export async function putMyDoctorProfile(req: Request, res: Response) {
  const me = req.user!;
  const { phone, bio, specialties } = req.body || {};
  const updated = await svc.upsertDoctorProfile(me, me.id, { phone, bio, specialties });
  res.json(updated);
}

export async function getSpecialties(req: Request, res: Response) {
  const out = await svc.listDistinctSpecialties();
  res.json(out);
}
