import { z } from 'zod';

/** util: '' -> undefined */
const emptyToUndef = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), inner);

/** util: date string 'YYYY-MM-DD' OU ISO -> Date | undefined */
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

/** --------- LIST QUERY --------- */
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

/** --------- PARAM ID --------- */
export const patientIdParam = z.object({ id: z.string().uuid() });

/** --------- CREATE --------- */
export const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  ownerId: z.string().uuid().optional(), // DOCTOR ignoré, ADMIN/SECRETARY requis
  birthDate: dateLoose,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  assuranceNumber: z.string().optional(),
  doctorName: z.string().optional(),
  notes: z.string().optional(),
});
export type CreatePatientDTO = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();
export type UpdatePatientDTO = z.infer<typeof updatePatientSchema>;

/*
// --------- ASSIGN DOCTOR --------- ---
export const assignDoctorSchema = z.object({
  doctorId: z.string().uuid(),
  specialty: z.string().trim().optional(), // si fourni, on valide que le doc la possède
  primary: z.boolean().optional().default(false),
});

export const transferOwnerSchema = z.object({
  newOwnerId: z.string().uuid(),
});
*/
