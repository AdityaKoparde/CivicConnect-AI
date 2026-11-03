/** Central error handler — maps known errors to the uniform envelope. */
import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Endpoint not found', details: [] },
  });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }
  const anyErr = err as { code?: string; message?: string; status?: number };
  // multer file-size / type errors
  if (anyErr?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'File is too large (max 5 MB)', details: [] },
    });
    return;
  }
  // Prisma unique constraint
  if (anyErr?.code === 'P2002') {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with that value already exists', details: [] },
    });
    return;
  }
  logger.error('unhandled_error', { message: String(anyErr?.message ?? err) });
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: [] },
  });
};
