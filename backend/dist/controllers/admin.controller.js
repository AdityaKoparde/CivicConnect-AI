"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.runEscalations = exports.deleteEscalationRule = exports.patchEscalationRule = exports.createEscalationRule = exports.listEscalationRules = exports.patchOfficer = exports.createOfficer = exports.listOfficers = exports.dashboardStats = void 0;
/** Admin controller: dashboard stats, officer management, escalation rules,
 *  audit log access. All role-checked; scope enforced in services. */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const auth_1 = require("../middleware/auth");
const service_1 = require("../services/audit/service");
const service_2 = require("../services/stats/service");
const service_3 = require("../services/escalation/service");
const schemas_1 = require("../validators/schemas");
exports.dashboardStats = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        res.json(await (0, service_2.adminStats)(req.user));
    }),
];
exports.listOfficers = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const departmentId = req.user.role === 'DEPARTMENT_ADMIN'
            ? req.user.departmentId
            : typeof req.query.departmentId === 'string'
                ? req.query.departmentId
                : undefined;
        const rows = await prisma_1.prisma.user.findMany({
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
exports.createOfficer = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.officerCreateSchema.parse(req.body);
        // department admins may only create inside their own department
        if (req.user.role === 'DEPARTMENT_ADMIN' &&
            input.departmentId !== req.user.departmentId) {
            throw (0, errors_1.badRequest)('You can only create officers in your own department');
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
        if (existing)
            throw (0, errors_1.conflict)('A user with this email already exists');
        const department = await prisma_1.prisma.department.findUnique({
            where: { id: input.departmentId },
        });
        if (!department)
            throw (0, errors_1.badRequest)('Department does not exist');
        const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                passwordHash,
                role: input.role,
                departmentId: input.departmentId,
                jurisdictionId: input.jurisdictionId ?? null,
            },
        });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'OFFICER_CREATED', entityType: 'User',
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
exports.patchOfficer = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.officerPatchSchema.parse(req.body);
        const target = await prisma_1.prisma.user.findUnique({ where: { id: req.params.id } });
        if (!target || target.role === 'CITIZEN')
            throw (0, errors_1.notFound)('Officer not found');
        if (req.user.role === 'DEPARTMENT_ADMIN' &&
            target.departmentId !== req.user.departmentId) {
            throw (0, errors_1.badRequest)('That officer belongs to another department');
        }
        if (req.user.role !== 'SUPER_ADMIN' && input.role === 'SUPER_ADMIN') {
            throw (0, errors_1.badRequest)('Only a super administrator can grant that role');
        }
        const data = { ...input };
        if (input.password) {
            data.passwordHash = await bcryptjs_1.default.hash(input.password, 10);
            delete data.password;
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: req.params.id },
            data: data,
        });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'OFFICER_UPDATED', entityType: 'User',
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
exports.listEscalationRules = [
    (0, auth_1.requireRole)('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const rules = await prisma_1.prisma.escalationRule.findMany({
            include: { targetDepartment: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
        });
        res.json({ items: rules });
    }),
];
exports.createEscalationRule = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.escalationRuleSchema.parse(req.body);
        const rule = await prisma_1.prisma.escalationRule.create({
            data: {
                ...input,
                category: input.category ?? null,
                priority: input.priority ?? null,
                targetDepartmentId: input.targetDepartmentId ?? null,
                active: input.active ?? true,
                isDemo: true,
            },
        });
        await (0, service_1.audit)({
            actorId: req.user.id, action: 'ESCALATION_RULE_CREATED',
            entityType: 'EscalationRule', entityId: rule.id, ip: req.ip,
        });
        res.status(201).json({ rule });
    }),
];
exports.patchEscalationRule = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.escalationRuleSchema.partial().parse(req.body);
        const existing = await prisma_1.prisma.escalationRule.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw (0, errors_1.notFound)('Rule not found');
        const rule = await prisma_1.prisma.escalationRule.update({
            where: { id: req.params.id },
            data: input,
        });
        res.json({ rule });
    }),
];
exports.deleteEscalationRule = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const existing = await prisma_1.prisma.escalationRule.findUnique({ where: { id: req.params.id } });
        if (!existing)
            throw (0, errors_1.notFound)('Rule not found');
        await prisma_1.prisma.escalationRule.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }),
];
exports.runEscalations = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
        const count = await (0, service_3.evaluateEscalations)(true);
        res.json({ escalated: count });
    }),
];
exports.auditLogs = [
    (0, auth_1.requireRole)('SUPER_ADMIN'),
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const [total, items] = await Promise.all([
            prisma_1.prisma.auditLog.count(),
            prisma_1.prisma.auditLog.findMany({
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
//# sourceMappingURL=admin.controller.js.map