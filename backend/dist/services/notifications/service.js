"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = notify;
exports.staffOfDepartment = staffOfDepartment;
exports.superAdminIds = superAdminIds;
const prisma_1 = require("../../config/prisma");
async function notify(userIds, type, title, body, complaintId, tx) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (ids.length === 0)
        return;
    const client = tx ?? prisma_1.prisma;
    await client.notification.createMany({
        data: ids.map((userId) => ({
            userId, type, title, body, complaintId: complaintId ?? null,
        })),
    });
}
/** Staff users who should hear about a complaint for a department. */
async function staffOfDepartment(departmentId, tx) {
    const client = tx ?? prisma_1.prisma;
    if (!departmentId)
        return [];
    const users = await client.user.findMany({
        where: {
            departmentId,
            isActive: true,
            role: { in: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'] },
        },
        select: { id: true },
    });
    return users.map((u) => u.id);
}
async function superAdminIds(tx) {
    const client = tx ?? prisma_1.prisma;
    const users = await client.user.findMany({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true },
    });
    return users.map((u) => u.id);
}
//# sourceMappingURL=service.js.map