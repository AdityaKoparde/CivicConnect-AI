/** Public catalog: health, stats, categories, departments, jurisdictions
 *  + admin CRUD for departments / jurisdictions / categories. */
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { CATEGORIES } from '../config/constants';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, notFound } from '../utils/errors';
import { requireRole } from '../middleware/auth';
import { audit } from '../services/audit/service';
import { publicStats } from '../services/stats/service';
import { aiHealth } from '../services/ai/client';
import {
  categoryPatchSchema,
  departmentCreateSchema,
  departmentPatchSchema,
  jurisdictionCreateSchema,
} from '../validators/schemas';

export const health = asyncHandler(async (_req: Request, res: Response) => {
  let database: 'up' | 'down' = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }
  const ai = await aiHealth();
  res.json({
    status: database === 'up' && ai ? 'ok' : 'degraded',
    database,
    ai: ai ? 'up' : 'down',
    aiProvider: ai?.provider ?? 'unknown',
    version: '1.0.0',
  });
});

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await publicStats());
});

export const categories = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json({
    items: rows.map((c) => ({
      key: c.key,
      label: c.label as Record<string, string>,
      description: c.description as Record<string, string>,
      icon: c.icon,
      active: c.active,
    })),
  });
});

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await prisma.department.findMany({
    where: { active: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { complaints: true } },
      children: { select: { id: true, name: true } },
    },
  });
  res.json({
    items: rows.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      type: d.type,
      description: d.description,
      categories: d.categories,
      jurisdictionLevel: d.jurisdictionLevel,
      district: d.district,
      parentId: d.parentId,
      isDemo: d.isDemo,
      active: d.active,
      complaintCount: d._count.complaints,
      contactEmail: d.contactEmail,
      contactWebsite: d.contactWebsite,
    })),
  });
});

export const departmentDetail = asyncHandler(async (req: Request, res: Response) => {
  const d = await prisma.department.findFirst({
    where: { id: req.params.id },
    include: { _count: { select: { complaints: true, officers: true } } },
  });
  if (!d) throw notFound('Department not found');
  res.json({
    department: {
      ...d,
      complaintCount: d._count.complaints,
      officerCount: d._count.officers,
    },
  });
});

export const createDepartment = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = departmentCreateSchema.parse(req.body);
    const dep = await prisma.department.create({
      data: {
        ...input,
        description: input.description ?? null,
        district: input.district ?? null,
        isDemo: true, // admin-created entries are demonstration registry data
      },
    });
    await audit({
      actorId: req.user!.id, action: 'DEPARTMENT_CREATED',
      entityType: 'Department', entityId: dep.id, ip: req.ip,
    });
    res.status(201).json({ department: dep });
  }),
];

export const updateDepartment = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = departmentPatchSchema.parse(req.body);
    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Department not found');
    if (input.district === null && existing.type !== 'TRIAGE') {
      // state-level departments keep district null; fine either way
    }
    const dep = await prisma.department.update({
      where: { id: req.params.id },
      data: input,
    });
    await audit({
      actorId: req.user!.id, action: 'DEPARTMENT_UPDATED',
      entityType: 'Department', entityId: dep.id,
      metadata: { fields: Object.keys(input) }, ip: req.ip,
    });
    res.json({ department: dep });
  }),
];

export const deactivateDepartment = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Department not found');
    const dep = await prisma.department.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    await audit({
      actorId: req.user!.id, action: 'DEPARTMENT_DEACTIVATED',
      entityType: 'Department', entityId: dep.id, ip: req.ip,
    });
    res.json({ department: dep });
  }),
];

export const listJurisdictions = asyncHandler(async (req: Request, res: Response) => {
  const level = typeof req.query.level === 'string' ? req.query.level : undefined;
  const district = typeof req.query.district === 'string' ? req.query.district : undefined;
  const rows = await prisma.jurisdiction.findMany({
    where: {
      active: true,
      ...(level ? { level: level as never } : {}),
      ...(district ? { district: { equals: district, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    take: 500,
  });
  res.json({
    items: rows.map((j) => ({
      id: j.id,
      level: j.level,
      name: j.name,
      code: j.code,
      parentId: j.parentId,
      district: j.district,
      taluk: j.taluk,
      latitude: j.latitude,
      longitude: j.longitude,
      isDemo: j.isDemo,
    })),
  });
});

export const createJurisdiction = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = jurisdictionCreateSchema.parse(req.body);
    const j = await prisma.jurisdiction.create({ data: input });
    await audit({
      actorId: req.user!.id, action: 'JURISDICTION_CREATED',
      entityType: 'Jurisdiction', entityId: j.id, ip: req.ip,
    });
    res.status(201).json({ jurisdiction: j });
  }),
];

export const updateJurisdiction = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = jurisdictionCreateSchema.partial().parse(req.body);
    const existing = await prisma.jurisdiction.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Jurisdiction not found');
    const j = await prisma.jurisdiction.update({ where: { id: req.params.id }, data: input });
    res.json({ jurisdiction: j });
  }),
];

export const deactivateJurisdiction = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.jurisdiction.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Jurisdiction not found');
    const j = await prisma.jurisdiction.update({
      where: { id: req.params.id }, data: { active: false },
    });
    res.json({ jurisdiction: j });
  }),
];

export const updateCategory = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = categoryPatchSchema.parse(req.body);
    const existing = await prisma.category.findUnique({ where: { key: req.params.key } });
    if (!existing) throw notFound('Category not found');
    const c = await prisma.category.update({ where: { key: req.params.key }, data: input });
    await audit({
      actorId: req.user!.id, action: 'CATEGORY_UPDATED',
      entityType: 'Category', entityId: c.key, ip: req.ip,
    });
    res.json({ category: c });
  }),
];

export const createCategory = [
  requireRole('SUPER_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as { key?: string; label?: Record<string, string> };
    if (!body?.key || !body?.label?.en) {
      throw badRequest('key and label.en are required');
    }
    if (CATEGORIES.some((c) => c.key === body.key)) {
      throw badRequest('Category key already exists in the default set');
    }
    const c = await prisma.category.create({
      data: {
        key: body.key,
        label: body.label as never,
        description: (body as { description?: object }).description ?? {},
        icon: (body as { icon?: string }).icon ?? 'FileText',
        sortOrder: 900,
      },
    });
    res.status(201).json({ category: c });
  }),
];
