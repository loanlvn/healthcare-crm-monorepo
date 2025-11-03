import type { Request, Response } from 'express';
import { listPatients, getPatient, createPatient, updatePatient, deletePatient } from './service';
import { createPatientSchema, listPatientsQuerySchema, updatePatientSchema } from './dto';

export async function getPatients(req: Request, res: Response) {
  const auth = req.user!;
  const q = listPatientsQuerySchema.parse(req.query);
  const page = await listPatients(auth, q);
  res.json(page);
}

export async function getPatientById(req: Request, res: Response) {
  const auth = req.user!;
  const { id } = req.params;
  const p = await getPatient(auth, id);
  res.json(p);
}

export async function postPatient(req: Request, res: Response) {
  const auth = req.user!;
  const input = createPatientSchema.parse(req.body);
  const p = await createPatient(auth, input);
  res.status(201).json(p);
}

export async function putPatient(req: Request, res: Response) {
  const auth = req.user!;
  const { id } = req.params;
  const input = updatePatientSchema.parse(req.body);
  const p = await updatePatient(auth, id, input);
  res.json(p);
}

export async function delPatient(req: Request, res: Response) {
  const auth = req.user!;
  const { id } = req.params;
  await deletePatient(auth, id);
  res.status(204).end();
}
