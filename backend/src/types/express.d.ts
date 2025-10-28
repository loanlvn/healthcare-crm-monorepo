import type { Role } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tokenId?: string;
    }
  }
}
export {};
