import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginDTO = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(), // secondes pour l'access token
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(['ADMIN','DOCTOR','SECRETARY']),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  })
});
export type LoginResponseDTO = z.infer<typeof loginResponseSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshDTO = z.infer<typeof refreshSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type RefreshResponseDTO = z.infer<typeof refreshResponseSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});
export type LogoutDTO = z.infer<typeof logoutSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Current password required"),
  newPassword: z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[a-z]/, "At least one lowercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^\w\s]/, "At least one special character"),
});

export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;

export const forgotRequestSchema = z.object({
  email: z.string().email(),
});

export const forgotVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Invalid code"),
});

export const forgotResetSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "At least one uppercase letter")
    .regex(/[a-z]/, "At least one lowercase letter")
    .regex(/[0-9]/, "At least one number")
    .regex(/[^\w\s]/, "At least one special character"),
});