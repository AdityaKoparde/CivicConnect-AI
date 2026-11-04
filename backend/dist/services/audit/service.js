"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const prisma_1 = require("../../config/prisma");
async function audit(input) {
    const client = input.tx ?? prisma_1.prisma;
    await client.auditLog.create({
        data: {
            actorId: input.actorId ?? null,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId ?? null,
            metadata: (input.metadata ?? undefined),
            ip: input.ip ?? null,
        },
    });
}
//# sourceMappingURL=service.js.map