"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategory = exports.updateCategory = exports.deactivateJurisdiction = exports.updateJurisdiction = exports.createJurisdiction = exports.listJurisdictions = exports.deactivateDepartment = exports.updateDepartment = exports.createDepartment = exports.departmentDetail = exports.listDepartments = exports.categories = exports.stats = exports.health = void 0;
const prisma_1 = require("../config/prisma");
const constants_1 = require("../config/constants");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/audit/service");
const service_2 = require("../services/stats/service");
const client_1 = require("../services/ai/client");
const schemas_1 = require("../validators/schemas");
exports.health = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    let database = 'up';
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
    }
    catch {
        database = 'down';
    }
    const ai = await (0, client_1.aiHealth)();
    res.json({
        status: database === 'up' && ai ? 'ok' : 'degraded',
        database,
        ai: ai ? 'up' : 'down',
        aiProvider: ai?.provider ?? 'unknown',
        version: '1.0.0',
    });
});
exports.stats = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.json(await (0, service_2.publicStats)());
});
exports.categories = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const rows = await prisma_1.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({
        items: rows.map((c) => ({
            key: c.key,
            label: c.label,
            description: c.description,
            icon: c.icon,
            active: c.active,
        })),
    });
});
exports.listDepartments = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const rows = await prisma_1.prisma.department.findMany({
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
exports.departmentDetail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const d = await prisma_1.prisma.department.findFirst({
        where: { id: req.params.id },
        include: { _count: { select: { complaints: true, officers: true } } },
    });
    if (!d)
        throw (0, errors_1.notFound)('Department not found');
    res.json({
        department: {
            ...d,
            complaintCount: d._count.complaints,
            officerCount: d._count.officers,
        },
    });
});
exports.createDepartment = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.departmentCreateSchema.parse(req.body);
        const dep = await prisma_1.prisma.department.create({
            data: {
                ...input,
                description: input.description ?? null,
                district: input.district ?? null,
                isDemo: true, // admin-created entries are demonstration registry data
            },
        });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'DEPARTMENT_CREATED',
            entityType: 'Department', entityId: dep.id, ip: req.ip,
        });
        res.status(201).json({ department: dep });
    }),
];
exports.updateDepartment = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.departmentPatchSchema.parse(req.body);
        const existing = await prisma_1.prisma.department.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw (0, errors_1.notFound)('Department not found');
        if (input.district === null && existing.type !== 'TRIAGE') {
            // state-level departments keep district null; fine either way
        }
        const dep = await prisma_1.prisma.department.update({
            where: { id: req.params.id },
            data: input,
        });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'DEPARTMENT_UPDATED',
            entityType: 'Department', entityId: dep.id,
            metadata: { fields: Object.keys(input) }, ip: req.ip,
        });
        res.json({ department: dep });
    }),
];
exports.deactivateDepartment = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const existing = await prisma_1.prisma.department.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw (0, errors_1.notFound)('Department not found');
        const dep = await prisma_1.prisma.department.update({
            where: { id: req.params.id },
            data: { active: false },
        });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'DEPARTMENT_DEACTIVATED',
            entityType: 'Department', entityId: dep.id, ip: req.ip,
        });
        res.json({ department: dep });
    }),
];
exports.listJurisdictions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const level = typeof req.query.level === 'string' ? req.query.level : undefined;
    const district = typeof req.query.district === 'string' ? req.query.district : undefined;
    const rows = await prisma_1.prisma.jurisdiction.findMany({
        where: {
            active: true,
            ...(level ? { level: level } : {}),
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
exports.createJurisdiction = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.jurisdictionCreateSchema.parse(req.body);
        const j = await prisma_1.prisma.jurisdiction.create({ data: input });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'JURISDICTION_CREATED',
            entityType: 'Jurisdiction', entityId: j.id, ip: req.ip,
        });
        res.status(201).json({ jurisdiction: j });
    }),
];
exports.updateJurisdiction = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.jurisdictionCreateSchema.partial().parse(req.body);
        const existing = await prisma_1.prisma.jurisdiction.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw (0, errors_1.notFound)('Jurisdiction not found');
        const j = await prisma_1.prisma.jurisdiction.update({ where: { id: req.params.id }, data: input });
        res.json({ jurisdiction: j });
    }),
];
exports.deactivateJurisdiction = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const existing = await prisma_1.prisma.jurisdiction.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw (0, errors_1.notFound)('Jurisdiction not found');
        const j = await prisma_1.prisma.jurisdiction.update({
            where: { id: req.params.id }, data: { active: false },
        });
        res.json({ jurisdiction: j });
    }),
];
exports.updateCategory = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.categoryPatchSchema.parse(req.body);
        const existing = await prisma_1.prisma.category.findUnique({ where: { key: req.params.key } });
        if (!existing)
            throw (0, errors_1.notFound)('Category not found');
        const c = await prisma_1.prisma.category.update({ where: { key: req.params.key }, data: input });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'CATEGORY_UPDATED',
            entityType: 'Category', entityId: c.key, ip: req.ip,
        });
        res.json({ category: c });
    }),
];
exports.createCategory = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const body = req.body;
        if (!body?.key || !body?.label?.en) {
            throw (0, errors_1.badRequest)('key and label.en are required');
        }
        if (constants_1.CATEGORIES.some((c) => c.key === body.key)) {
            throw (0, errors_1.badRequest)('Category key already exists in the default set');
        }
        const c = await prisma_1.prisma.category.create({
            data: {
                key: body.key,
                label: body.label,
                description: body.description ?? {},
                icon: body.icon ?? 'FileText',
                sortOrder: 900,
            },
        });
        res.status(201).json({ category: c });
    }),
];
//# sourceMappingURL=catalog.controller.js.map