import type { Role } from '@prisma/client';

export type JwtAccessPayload = { sub: string; role: Role; iat: number; exp: number };
export type JwtRefreshPayload = { sub: string; tokenId: string; iat: number; exp: number };
