import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../infra/prisma';

type JwtAccessPayload = { sub: string; role: 'ADMIN'|'DOCTOR'|'SECRETARY'; iat: number; exp: number };

export const authAccess: RequestHandler = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'NO_TOKEN' }); // 401 standard
  }
  const token = h.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtAccessPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, mustChangePassword: true,
        createdAt: true, updatedAt: true,
      }
    });

    if (!user) return res.status(401).json({ code: 'USER_NOT_FOUND' });
    if (!user.isActive) return res.status(403).json({ code: 'USER_DISABLED' }); // 403: authentifié mais interdit

    req.user = {
      id: user.id, email: user.email,
      firstName: user.firstName, lastName: user.lastName,
      role: user.role, isActive: user.isActive, mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt?.toISOString() ?? null,
    };

    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('X-User-Id', user.id);
      res.setHeader('X-User-Role', user.role);
    }

    next();
  } catch (e) {
    // token expiré / invalide
    return res.status(401).json({ code: 'TOKEN_INVALID' });
  }
};
