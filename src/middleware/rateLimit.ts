/** Rate limiting per docs/api-documentation.md §11. */
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

const handler = (limitName: string) => (_req: Request, res: Response) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: `Too many requests (${limitName}). Please try again later.`,
      details: [],
    },
  });
};

// login/register: 10 / 15 min per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('authentication'),
});

// public tracking: 30 / min per IP
export const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('tracking'),
});

// chat messages: 60 / min per user (falls back to IP for guests)
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  handler: handler('chat'),
});

// public catalog reads: 120 / min per IP
export const catalogLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('catalog'),
});

// general API: 300 / min per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('api'),
});
