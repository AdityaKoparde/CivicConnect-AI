/** Admin controller: dashboard stats, officer management, escalation rules,
 *  audit log access. All role-checked; scope enforced in services. */
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, conflict, notFound } from '../utils/errors';
import { requireRole } from '../middleware/auth';
import { audit } from '../services/audit/service';
import { adminStats } from '../services/stats/service';
import { evaluateEscalations } from '../services/escalation/service';
import {
  escalationRuleSchema,
  officerCreateSchema,
  officerPatchSchema,
} from '../validators/schemas';

export const dashboardStats = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await adminStats(req.user!));
  }),
];

export const listOfficers = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const departmentId =
      req.user!.role === 'DEPARTMENT_ADMIN'
        ? req.user!.departmentId
        : typeof req.query.departmentId === 'string'
          ? req.query.departmentId
          : undefined;
    const rows = await prisma.user.findMany({
      where: {
        role: { in: ['DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'] },
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        jurisdiction: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        departmentId: u.departmentId,
        departmentName: u.department?.name ?? null,
        jurisdictionId: u.jurisdictionId,
        jurisdictionName: u.jurisdiction?.name ?? null,
        createdAt: u.createdAt,
      })),
    });
  }),
];

export const createOfficer = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = officerCreateSchema.parse(req.body);
    // department admins may only create inside their own department
    if (
      req.user!.role === 'DEPARTMENT_ADMIN' &&
      input.departmentId !== req.user!.departmentId
    ) {
      throw badRequest('You can only create officers in your own department');
    }
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw conflict('A user with this email already exists');
    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!department) throw badRequest('Department does not exist');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        departmentId: input.departmentId,
        jurisdictionId: input.jurisdictionId ?? null,
      },
    });
    await audit({
      actorId: req.user!.id, action: 'OFFICER_CREATED', entityType: 'User',
      entityId: user.id, metadata: { role: input.role }, ip: req.ip,
    });
    res.status(201).json({
      officer: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        departmentId: user.departmentId, isActive: user.isActive,
      },
    });
  }),
];

export const patchOfficer = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = officerPatchSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || target.role === 'CITIZEN') throw notFound('Officer not found');
    if (
      req.user!.role === 'DEPARTMENT_ADMIN' &&
      target.departmentId !== req.user!.departmentId
    ) {
      throw badRequest('That officer belongs to another department');
    }
    if (req.user!.role !== 'SUPER_ADMIN' && input.role === 'SUPER_ADMIN') {
      throw badRequest('Only a super administrator can grant that role');
    }

    const data: Record<string, unknown> = { ...input };
    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
      delete data.password;
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: data as never,
    });
    await audit({
      actorId: req.user!.id, action: 'OFFICER_UPDATED', entityType: 'User',
      entityId: user.id, metadata: { fields: Object.keys(input) }, ip: req.ip,
    });
    res.json({
      officer: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        departmentId: user.departmentId, jurisdictionId: user.jurisdictionId,
        isActive: user.isActive,
      },
    });
  }),
];

export const listEscalationRules = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (_req: Request, res: Response) => {
    const rules = await prisma.escalationRule.findMany({
      include: { targetDepartment: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ items: rules });
  }),
];

export const createEscalationRule = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = escalationRuleSchema.parse(req.body);
    const rule = await prisma.escalationRule.create({
      data: {
        ...input,
        category: input.category ?? null,
        priority: (input.priority as never) ?? null,
        targetDepartmentId: input.targetDepartmentId ?? null,
        active: input.active ?? true,
        isDemo: true,
      },
    });
    await audit({
      actorId: req.user!.id, action: 'ESCALATION_RULE_CREATED',
      entityType: 'EscalationRule', entityId: rule.id, ip: req.ip,
    });
    res.status(201).json({ rule });
  }),
];

export const patchEscalationRule = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = escalationRuleSchema.partial().parse(req.body);
    const existing = await prisma.escalationRule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Rule not found');
    const rule = await prisma.escalationRule.update({
      where: { id: req.params.id },
      data: input as never,
    });
    res.json({ rule });
  }),
];

export const deleteEscalationRule = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.escalationRule.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Rule not found');
    await prisma.escalationRule.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
];

export const runEscalations = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (_req: Request, res: Response) => {
    const count = await evaluateEscalations(true);
    res.json({ escalated: count });
  }),
];

export const auditLogs = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const [total, items] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { email: true, name: true } } },
      }),
    ]);
    res.json({
      items: items.map((a) => ({
        id: a.id,
        actorEmail: a.actor?.email ?? null,
        actorName: a.actor?.name ?? null,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: a.metadata,
        ip: a.ip,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
    });
  }),
];
