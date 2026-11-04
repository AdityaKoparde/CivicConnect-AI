/** Authentication controller: register / login / logout / me. */
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { SESSION_COOKIE } from '../config/constants';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, unauthenticated } from '../utils/errors';
import { signSession } from '../utils/crypto';
import { audit } from '../services/audit/service';
import { loginSchema, registerSchema } from '../validators/schemas';

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProd,
  maxAge: env.jwtExpiresInSeconds * 1000,
  path: '/',
});

const userView = (u: {
  id: string; email: string; name: string; role: string; phone: string | null;
  departmentId: string | null; jurisdictionId: string | null; isActive: boolean;
  createdAt: Date; department?: { name: string } | null;
}) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  phone: u.phone,
  departmentId: u.departmentId,
  departmentName: u.department?.name ?? null,
  jurisdictionId: u.jurisdictionId,
  isActive: u.isActive,
  createdAt: u.createdAt.toISOString(),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw badRequest('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone || null,
        role: 'CITIZEN',
      },
    });
    await tx.citizen.create({
      data: { userId: u.id, name: input.name, phone: input.phone || null },
    });
    return u;
  });

  const token = signSession({ sub: user.id, role: user.role, name: user.name });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  await audit({
    actorId: user.id, action: 'USER_REGISTERED', entityType: 'User',
    entityId: user.id, ip: req.ip,
  });
  res.status(201).json({
    user: userView({ ...user, department: null }),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { department: { select: { name: true } } },
  });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthenticated('Incorrect email or password');
  }
  if (!user.isActive) throw unauthenticated('This account has been deactivated');

  const token = signSession({ sub: user.id, role: user.role, name: user.name });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  await audit({
    actorId: user.id, action: 'USER_LOGIN', entityType: 'User',
    entityId: user.id, ip: req.ip,
  });
  res.json({ user: userView(user) });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw unauthenticated();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { department: { select: { name: true } } },
  });
  if (!user) throw unauthenticated();
  res.json({ user: userView(user) });
});
