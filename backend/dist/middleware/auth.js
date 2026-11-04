"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOfficer = exports.isDeptAdmin = exports.isSuperAdmin = exports.isStaff = exports.requireRole = exports.requireAuth = exports.attachUser = void 0;
const prisma_1 = require("../config/prisma");
const constants_1 = require("../config/constants");
const errors_1 = require("../utils/errors");
const crypto_1 = require("../utils/crypto");
const extractToken = (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer '))
        return auth.slice(7).trim();
    const cookies = req.cookies;
    const cookie = cookies?.[constants_1.SESSION_COOKIE];
    return cookie ?? null;
};
/** Attach req.user when a valid session exists (does not require it). */
const attachUser = async (req, _res, next) => {
    try {
        const token = extractToken(req);
        if (!token)
            return next();
        const payload = (0, crypto_1.verifySession)(token);
        if (!payload)
            return next();
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true, email: true, name: true, role: true,
                departmentId: true, jurisdictionId: true, isActive: true,
            },
        });
        if (!user || !user.isActive)
            return next();
        req.user = user;
        req.usesBearer = req.headers.authorization?.startsWith('Bearer ') ?? false;
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.attachUser = attachUser;
const requireAuth = (req, _res, next) => {
    if (!req.user)
        return next((0, errors_1.unauthenticated)());
    next();
};
exports.requireAuth = requireAuth;
const requireRole = (...roles) => (req, _res, next) => {
    if (!req.user)
        return next((0, errors_1.unauthenticated)());
    if (!roles.includes(req.user.role)) {
        return next((0, errors_1.forbidden)('Your account role does not allow this action'));
    }
    next();
};
exports.requireRole = requireRole;
const isStaff = (role) => role === 'SUPER_ADMIN' || role === 'DEPARTMENT_ADMIN' || role === 'DEPARTMENT_OFFICER';
exports.isStaff = isStaff;
/** Convenience predicates used by controllers. */
const isSuperAdmin = (u) => u?.role === 'SUPER_ADMIN';
exports.isSuperAdmin = isSuperAdmin;
const isDeptAdmin = (u) => u?.role === 'DEPARTMENT_ADMIN';
exports.isDeptAdmin = isDeptAdmin;
const isOfficer = (u) => u?.role === 'DEPARTMENT_OFFICER';
exports.isOfficer = isOfficer;
//# sourceMappingURL=auth.js.map