/** Authentication + role-based authorization middleware.
 *  Session = httpOnly cookie (browser) or Authorization: Bearer (tests/API clients).
 *  Authorization is enforced HERE on every protected route — never in the UI. */
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { SESSION_COOKIE } from '../config/constants';
import { forbidden, unauthenticated } from '../utils/errors';
import { verifySession } from '../utils/crypto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  departmentId: string | null;
  jurisdictionId: string | null;
  isActive: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      usesBearer?: boolean;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  const cookie = cookies?.[SESSION_COOKIE];
  return cookie ?? null;
};

/** Attach req.user when a valid session exists (does not require it). */
export const attachUser = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifySession(token);
    if (!payload) return next();
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, role: true,
        departmentId: true, jurisdictionId: true, isActive: true,
      },
    });
    if (!user || !user.isActive) return next();
    req.user = user;
    req.usesBearer = req.headers.authorization?.startsWith('Bearer ') ?? false;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(unauthenticated());
  next();
};

export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) {
      return next(forbidden('Your account role does not allow this action'));
    }
    next();
  };

export const isStaff = (role: string): boolean =>
  role === 'SUPER_ADMIN' || role === 'DEPARTMENT_ADMIN' || role === 'DEPARTMENT_OFFICER';

/** Convenience predicates used by controllers. */
export const isSuperAdmin = (u?: AuthUser): boolean => u?.role === 'SUPER_ADMIN';
export const isDeptAdmin = (u?: AuthUser): boolean => u?.role === 'DEPARTMENT_ADMIN';
export const isOfficer = (u?: AuthUser): boolean => u?.role === 'DEPARTMENT_OFFICER';
