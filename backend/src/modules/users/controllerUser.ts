// modules/users/controller.ts
import type { Request, Response } from 'express';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from './dto';
import * as svc from './serviceUser';

export async function postUser(req: Request, res: Response) {
  const dto = createUserSchema.parse(req.body);
  const out = await svc.createUser(req.user!.id, dto);
  return res.status(201).json(out);
}

export async function putUser(req: Request, res: Response) {
  const dto = updateUserSchema.parse(req.body);
  const out = await svc.updateUser(req.user!.id, req.params.id, dto);
  return res.json(out);
}

export async function getMe(req: Request, res: Response) {
  const me = await svc.getMe(req.user!.id);
  return res.json(me);
}

export async function getUser(req: Request, res: Response) {
  const targetId = req.params.id;
  const actorId = req.user!.id;
  const actorRole = req.user!.role;

  const out = await svc.getUserById(actorId, actorRole, targetId);
  return res.json(out);
}

export async function getUsers(req: Request, res: Response) {
  const q = listUsersQuerySchema.parse(req.query);
  const out = await svc.listUsers(q);
  return res.json(out);
}

// Note: deleteUser not implemented yet

export async function putDisableUser(req: Request, res: Response) {
  const out = await svc.disableUser(req.user!.role, req.params.id);
  return res.json(out);
}