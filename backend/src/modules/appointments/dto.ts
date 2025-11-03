import { date, trim, z } from 'zod';

export const AppStatusEnum = z.enum(['SCHEDULED','CONFIRMED','CANCELLED','NO_SHOW','DONE']);

// Query: GET /appointments
export const listAppointmentsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(15),
  orderBy: z.enum(["startsAt","createdAt"]).default("startsAt"),
  order: z.enum(["asc","desc"]).default("asc"),
});


export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

// DTO: POST /appointments
export const createAppointmentSchema = z.object({
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    status: AppStatusEnum.optional().default('SCHEDULED'),
    location: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
});

// DTO: PATCH /appointments/:id
export const updateAppointmentSchema = z.object({
  startsAt: z.string().datetime().optional(),   // ISO
  endsAt: z.string().datetime().optional(),     // ISO
  reason: z.string().trim().min(1).max(500).optional(),
  status: AppStatusEnum.optional(),
  location: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().min(1).max(2000).optional(),
})
  // si on envoie l’un des deux horaires, on doit respecter l’ordre si les deux sont présents
  .refine((v) => {
    if (v.startsAt && v.endsAt) {
      return new Date(v.startsAt) < new Date(v.endsAt);
    }
    return true;
  }, { message: "startsAt must be before endsAt", path: ["startsAt"] })
  .refine((v) => Object.keys(v).length > 0, { message: "Empty patch", path: [] });

export type UpdateAppointmentDto = z.infer<typeof updateAppointmentSchema>;

// DTO exits (type of API)

export type AppointmentDTO = {
    id: string;
    patientId: string;
    doctorId: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
    status: z.infer<typeof AppStatusEnum>;
    location?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    patient? : {
        id: string;
        firstName: string | null;
        lastName: string | null;
    };
    doctor? : {
        id: string;
        firstName: string | null;
        lastName: string | null;
    };
}