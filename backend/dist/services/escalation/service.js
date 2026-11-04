"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateEscalations = evaluateEscalations;
/** Configurable escalation rules — complaints that sit too long escalate.
 *  Throttled to once per 60s across the process. */
const prisma_1 = require("../../config/prisma");
const service_1 = require("../notifications/service");
const logger_1 = require("../../utils/logger");
let lastRun = 0;
const THROTTLE_MS = 60_000;
const ACTIVE_STATUSES = [
    'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'AWAITING_CITIZEN_INFO',
];
async function evaluateEscalations(force = false) {
    const now = Date.now();
    if (!force && now - lastRun < THROTTLE_MS)
        return 0;
    lastRun = now;
    try {
        const rules = await prisma_1.prisma.escalationRule.findMany({
            where: { active: true },
            include: { targetDepartment: { select: { id: true, name: true } } },
        });
        if (rules.length === 0)
            return 0;
        let escalated = 0;
        for (const rule of rules) {
            const cutoff = new Date(now - rule.hoursToEscalate * 3600_000);
            const stale = await prisma_1.prisma.complaint.findMany({
                where: {
                    status: { in: [...ACTIVE_STATUSES] },
                    updatedAt: { lt: cutoff },
                    ...(rule.category ? { category: rule.category } : {}),
                    ...(rule.priority ? { priority: rule.priority } : {}),
                    ...(rule.targetDepartmentId
                        ? { departmentId: rule.targetDepartmentId }
                        : { requiresManualReview: true }),
                },
                select: { id: true, complaintId: true, departmentId: true },
                take: 50,
            });
            for (const c of stale) {
                await prisma_1.prisma.$transaction(async (tx) => {
                    await tx.complaint.update({
                        where: { id: c.id },
                        data: { status: 'ESCALATED' },
                    });
                    await tx.complaintUpdate.create({
                        data: {
                            complaintId: c.id,
                            kind: 'ESCALATION',
                            toStatus: 'ESCALATED',
                            isPublic: true,
                            note: `Automatically escalated after ${rule.hoursToEscalate}h without resolution (rule: ${rule.name}).`,
                        },
                    });
                    const recipients = [
                        ...(await (0, service_1.staffOfDepartment)(c.departmentId, tx)),
                        ...(await (0, service_1.superAdminIds)(tx)),
                    ];
                    await (0, service_1.notify)(recipients, 'ESCALATED', `Complaint ${c.complaintId} escalated`, `Rule "${rule.name}" escalated this complaint after ${rule.hoursToEscalate} hours.`, c.id, tx);
                });
                escalated += 1;
            }
        }
        if (escalated > 0)
            logger_1.logger.info('escalations_applied', { count: escalated });
        return escalated;
    }
    catch (err) {
        logger_1.logger.warn('escalation_evaluation_failed', { message: String(err) });
        return 0;
    }
}
//# sourceMappingURL=service.js.map