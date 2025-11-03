import { Request, Response } from "express";
import { AppointmentsService } from "./serviceAppointment";
import {
  listAppointmentsQuerySchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "./dto";
import { z } from "zod";

const idParam = z.object({ id: z.string().uuid() });


export const AppointmentsController = {
  list: async (req: Request, res: Response) => {
    const q = listAppointmentsQuerySchema.parse(req.query);
    const current = { id: req.user!.id, role: req.user!.role as any };
    const listArgs = {
      from: q.from,
      to: q.to,
      doctorId: q.doctorId,
      patientId: q.patientId,
      page: q.page,
      pageSize: q.pageSize,
    };
    const out = await AppointmentsService.list(current, listArgs);
    res.json(out);
  },

  create: async (req: Request, res: Response) => {
    const body = createAppointmentSchema.parse(req.body);
    const current = { id: req.user!.id, role: req.user!.role as any };
    const out = await AppointmentsService.create(current, body);
    res.status(201).json(out);
  },

  detail: async (req: Request, res: Response) => {
    const { id } = idParam.parse(req.params);
    const current = { id: req.user!.id, role: req.user!.role as any };
    const out = await AppointmentsService.getById(current, id);
    res.json(out);
  },

  update: async (req: Request, res: Response) => {
    const { id } = idParam.parse(req.params);
    const patch = updateAppointmentSchema.parse(req.body);
    const current = { id: req.user!.id, role: req.user!.role as any };
    const out = await AppointmentsService.update(current, id, patch);
    res.json(out);
  },

  cancel: async (req: Request, res: Response) => {
    const { id } = idParam.parse(req.params);
    const current = { id: req.user!.id, role: req.user!.role as any };
    const out = await AppointmentsService.cancel(current, id);
    res.json(out);
  },

  forceReminder: async (req: Request, res: Response) => {
    const { id } = idParam.parse(req.params);
    const current = { id: req.user!.id, role: req.user!.role as any };
    const out = await AppointmentsService.forceReminder(current, id);
    res.json(out);
  },
};
