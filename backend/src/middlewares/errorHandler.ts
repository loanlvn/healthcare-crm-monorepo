import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, internalError } from '../utils/appError';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';

function fromPrisma(err: unknown): AppError | null {
  // Prisma "known" errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint
        return new AppError(409, 'CONFLICT', 'Unique constraint failed', { target: (err.meta as any)?.target });
      case 'P2025': // Not found
        return new AppError(404, 'NOT_FOUND', 'Record not found', err.meta);
      case 'P2003': // Foreign key
        return new AppError(409, 'CONFLICT', 'Foreign key constraint failed', err.meta);
      default:
        return internalError('INTERNAL_ERROR', { prismaCode: err.code, meta: err.meta });
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new AppError(400, 'BAD_REQUEST', 'Prisma validation error');
  }
  return null;
}

function fromJwt(err: unknown): AppError | null {
  if (err instanceof jwt.TokenExpiredError) {
    return new AppError(401, 'TOKEN_EXPIRED', 'Access token expired');
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return new AppError(401, 'TOKEN_INVALID', 'Invalid token');
  }
  return null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Zod → 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.issues },
    });
  }

  // AppError (throw volontaire depuis services/controllers)
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // JWT
  const jwtMapped = fromJwt(err);
  if (jwtMapped) {
    return res.status(jwtMapped.status).json({ error: { code: jwtMapped.code, message: jwtMapped.message } });
  }

  // Prisma
  const prismaMapped = fromPrisma(err);
  if (prismaMapped) {
    return res.status(prismaMapped.status).json({
      error: { code: prismaMapped.code, message: prismaMapped.message, details: prismaMapped.details },
    });
  }

  if (!isProd) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  const fallback = internalError();
  return res.status(fallback.status).json({
    error: { code: fallback.code, message: 'Unexpected error' },
    ...(isProd ? {} : { debug: String(err?.stack ?? err) }),
  });
};
