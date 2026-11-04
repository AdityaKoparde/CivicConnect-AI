"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.list = void 0;
const prisma_1 = require("../config/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const auth_1 = require("../middleware/auth");
const schemas_1 = require("../validators/schemas");
exports.list = [
    auth_1.requireAuth,
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const unreadOnly = req.query.unreadOnly === 'true';
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
        const where = {
            userId: req.user.id,
            ...(unreadOnly ? { readAt: null } : {}),
        };
        const [items, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
            }),
            prisma_1.prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
        ]);
        res.json({
            items: items.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                complaintId: n.complaintId,
                readAt: n.readAt,
                createdAt: n.createdAt,
            })),
            unreadCount,
        });
    }),
];
exports.markRead = [
    auth_1.requireAuth,
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const input = schemas_1.notificationsReadSchema.parse(req.body);
        await prisma_1.prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                readAt: null,
                ...(input.ids === 'all' ? {} : { id: { in: input.ids } }),
            },
            data: { readAt: new Date() },
        });
        const unreadCount = await prisma_1.prisma.notification.count({
            where: { userId: req.user.id, readAt: null },
        });
        res.json({ unreadCount });
    }),
];
//# sourceMappingURL=notifications.controller.js.map