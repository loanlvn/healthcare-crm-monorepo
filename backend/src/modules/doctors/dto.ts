import { z } from 'zod';

export const listDoctorsQuerySchema = z.object({
  q: z.string().optional(),
  specialty: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  orderBy: z.string().optional().default('createdAt'),
  order: z.enum(['asc','desc']).optional().default('desc'),
});

export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;

export const upsertProfileSchema = z.object({
  specialties: z.array(z.string().trim().min(1)).min(1),
  bio: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export type UpsertProfileDTO = z.infer<typeof upsertProfileSchema>;