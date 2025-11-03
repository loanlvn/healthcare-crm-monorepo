import { z } from 'zod';

const dateLoose = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const s = v.includes('T') ? v : `${v}T00:00:00.000Z`;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}, z.date().optional());

export const orderEnum = z.enum(['asc', 'desc']).default('desc');

export const listPatientsQuerySchema = z.object({
  q: z.string().trim().optional().default(''),
  ownerId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  orderBy: z.string().trim().optional().default('createdAt'),
  order: orderEnum.optional().default('desc'),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

export const patientIdParam = z.object({ id: z.string().uuid() });

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(2, "Le prénom est trop court"),
  lastName: z.string().trim().min(2, "Le nom est trop court"),
  ownerId: z.string().uuid().optional().or(z.literal("")).transform(v => v || undefined),
  birthDate: dateLoose,
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional(),
  address: z.string().optional(),
  assuranceNumber: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().optional(),
});

export type CreatePatientDTO = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientDTO = z.infer<typeof updatePatientSchema>;

