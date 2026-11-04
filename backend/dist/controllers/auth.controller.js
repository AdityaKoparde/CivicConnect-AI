"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.login = exports.register = void 0;
/** Authentication controller: register / login / logout / me. */
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const constants_1 = require("../config/constants");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const crypto_1 = require("../utils/crypto");
const service_1 = require("../services/audit/service");
const schemas_1 = require("../validators/schemas");
const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: env_1.env.isProd,
    maxAge: env_1.env.jwtExpiresInSeconds * 1000,
    path: '/',
});
const userView = (u) => ({
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
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const input = schemas_1.registerSchema.parse(req.body);
    const existing = await prisma_1.prisma.user.findUnique({ where: { email: input.email } });
    if (existing)
        throw (0, errors_1.badRequest)('An account with this email already exists');
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const user = await prisma_1.prisma.$transaction(async (tx) => {
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
    const token = (0, crypto_1.signSession)({ sub: user.id, role: user.role, name: user.name });
    res.cookie(constants_1.SESSION_COOKIE, token, cookieOptions());
    await (0, service_1.audit)({
        actorId: user.id, action: 'USER_REGISTERED', entityType: 'User',
        entityId: user.id, ip: req.ip,
    });
    res.status(201).json({
        user: userView({ ...user, department: null }),
    });
});
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const input = schemas_1.loginSchema.parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: input.email },
        include: { department: { select: { name: true } } },
    });
    if (!user || !(await bcryptjs_1.default.compare(input.password, user.passwordHash))) {
        throw (0, errors_1.unauthenticated)('Incorrect email or password');
    }
    if (!user.isActive)
        throw (0, errors_1.unauthenticated)('This account has been deactivated');
    const token = (0, crypto_1.signSession)({ sub: user.id, role: user.role, name: user.name });
    res.cookie(constants_1.SESSION_COOKIE, token, cookieOptions());
    await (0, service_1.audit)({
        actorId: user.id, action: 'USER_LOGIN', entityType: 'User',
        entityId: user.id, ip: req.ip,
    });
    res.json({ user: userView(user) });
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    res.clearCookie(constants_1.SESSION_COOKIE, { path: '/' });
    res.json({ ok: true });
});
exports.me = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user)
        throw (0, errors_1.unauthenticated)();
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.id },
        include: { department: { select: { name: true } } },
    });
    if (!user)
        throw (0, errors_1.unauthenticated)();
    res.json({ user: userView(user) });
});
//# sourceMappingURL=auth.controller.js.map