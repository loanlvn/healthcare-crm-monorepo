import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^\w\s]/, 'Must contain a special character'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['ADMIN','DOCTOR','SECRETARY']),
  isActive: z.boolean().optional(),
});
export type CreateUserDTO = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['ADMIN','DOCTOR','SECRETARY']).optional(), // ← cf. guard ci-dessous
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(['ADMIN', 'DOCTOR', 'SECRETARY']).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  orderBy: z.string().optional(),
  order: z.enum(['asc','desc']).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;