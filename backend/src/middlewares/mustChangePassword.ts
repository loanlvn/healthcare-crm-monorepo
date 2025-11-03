import type { Request, Response, NextFunction } from 'express';
import { forbidden } from '../utils/appError';

export function enforceMustChangePassword(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  if (!req.user.mustChangePassword) return next();


  if (req.method === 'GET' && (req.path === '/me' || req.originalUrl.endsWith('/users/me'))) {
    return next();
  }

  return next(forbidden('PASSWORD_CHANGE_REQUIRED'));
}
