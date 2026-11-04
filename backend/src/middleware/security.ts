/** CSRF defence + CORS + security headers.
 *  Cookie-authenticated mutations must carry an allowed Origin header;
 *  non-browser clients must use the Authorization header instead. */
import cors from 'cors';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';
import { forbidden } from '../utils/errors';

export const securityHeaders = helmet({
  contentSecurityPolicy: false, // API serves JSON; SPA sets its own CSP
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const corsMiddleware = cors({
  origin(origin, cb) {
    // no origin (curl, server-to-server) is allowed; the CSRF check below
    // still guards cookie-based mutations.
    if (!origin) return cb(null, true);
    cb(null, env.corsOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export const csrfGuard = (req: Request, _res: Response, next: NextFunction) => {
  if (!MUTATING.has(req.method)) return next();

  const origin = req.headers.origin;
  if (origin) {
    if (!env.corsOrigins.includes(origin)) {
      return next(forbidden('Request origin is not allowed'));
    }
    return next(); // browser request from an allowed origin
  }
  // No Origin header: only accept when authenticated WITHOUT cookies
  // (bearer token) — i.e. non-browser API clients.
  const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
  if (hasBearer) return next();
  next(forbidden('Missing Origin header for cookie-authenticated request'));
};
