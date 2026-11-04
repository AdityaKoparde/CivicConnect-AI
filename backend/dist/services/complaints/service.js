"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complaintScope = complaintScope;
exports.officerScope = officerScope;
exports.listComplaints = listComplaints;
exports.getComplaintDetail = getComplaintDetail;
exports.changeStatus = changeStatus;
exports.assignComplaint = assignComplaint;
exports.addComplaintUpdate = addComplaintUpdate;
exports.linkDuplicate = linkDuplicate;
exports.trackComplaint = trackComplaint;
exports.complaintMapPoints = complaintMapPoints;
exports.superAdminOrThrow = superAdminOrThrow;
const prisma_1 = require("../../config/prisma");
const constants_1 = require("../../config/constants");
const errors_1 = require("../../utils/errors");
const crypto_1 = require("../../utils/crypto");
const service_1 = require("../audit/service");
const service_2 = require("../escalation/service");
const service_3 = require("../notifications/service");
/** Server-side visibility scope — never rely on the frontend for this. */
function complaintScope(user) {
    if (user.role === 'SUPER_ADMIN')
        return {};
    if (user.role === 'DEPARTMENT_ADMIN') {
        return {
            OR: [
                { departmentId: user.departmentId },
                { departmentId: null, requiresManualReview: true },
            ],
        };
    }
    // DEPARTMENT_OFFICER: own department (+ jurisdiction district when set)
    const filters = [{ departmentId: user.departmentId }];
    return { AND: filters };
}
async function officerScope(user) {
    if (user.role !== 'DEPARTMENT_OFFICER')
        return complaintScope(user);
    const base = { departmentId: user.departmentId };
    if (!user.jurisdictionId)
        return base;
    const jur = await prisma_1.prisma.jurisdiction.findUnique({
        where: { id: user.jurisdictionId },
        select: { district: true },
    });
    if (!jur?.district)
        return base;
    return {
        AND: [base, { OR: [{ district: jur.district }, { district: null }] }],
    };
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Match a complaint by internal UUID or public CCAI-YYYY-NNNNNN id.
 *  Postgres rejects non-UUID literals compared against the `id` uuid column,
 *  so the `id` branch is only included when the value actually is a UUID. */
function byIdOrPublicId(id) {
    return UUID_RE.test(id) ? { OR: [{ id }, { complaintId: id }] } : { complaintId: id };
}
async function listComplaints(user, f) {
    await (0, service_2.evaluateEscalations)();
    const scope = await officerScope(user);
    const page = Math.max(1, f.page ?? 1);
    const limit = Math.min(100, Math.max(1, f.limit ?? 20));
    const where = {
        AND: [
            scope,
            f.category ? { category: f.category } : {},
            f.departmentId ? { departmentId: f.departmentId } : {},
            f.district ? { district: { equals: f.district, mode: 'insensitive' } } : {},
            f.priority ? { priority: f.priority } : {},
            f.status ? { status: f.status } : {},
            f.search
                ? {
                    OR: [
                        { complaintId: { contains: f.search, mode: 'insensitive' } },
                        { originalText: { contains: f.search, mode: 'insensitive' } },
                        { summary: { contains: f.search, mode: 'insensitive' } },
                    ],
                }
                : {},
        ],
    };
    const [total, items] = await Promise.all([
        prisma_1.prisma.complaint.count({ where }),
        prisma_1.prisma.complaint.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true, complaintId: true, category: true, priority: true, status: true,
                district: true, city: true, landmark: true, departmentId: true, aiConfidence: true,
                requiresManualReview: true, emergency: true, safetyRisk: true, language: true,
                createdAt: true, updatedAt: true, resolvedAt: true, isDemo: true,
                duplicateOfId: true,
                department: { select: { name: true } },
                assignedOfficer: { select: { name: true } },
                citizen: { select: { name: true } },
            },
        }),
    ]);
    return {
        items: items.map((c) => ({
            id: c.id,
            complaintId: c.complaintId,
            category: c.category,
            priority: c.priority,
            status: c.status,
            district: c.district,
            city: c.city,
            landmark: c.landmark,
            departmentId: c.departmentId,
            departmentName: c.department?.name ?? null,
            officerName: c.assignedOfficer?.name ?? null,
            citizenName: user.role === 'SUPER_ADMIN' || user.role === 'DEPARTMENT_ADMIN' ? c.citizen.name : c.citizen.name,
            aiConfidence: c.aiConfidence,
            requiresManualReview: c.requiresManualReview,
            emergency: c.emergency,
            safetyRisk: c.safetyRisk,
            language: c.language,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            resolvedAt: c.resolvedAt,
            duplicateOfId: c.duplicateOfId,
            isDemo: c.isDemo,
        })),
        total,
        page,
        limit,
    };
}
async function getComplaintDetail(user, idOrComplaintId) {
    const scope = await officerScope(user);
    const complaint = await prisma_1.prisma.complaint.findFirst({
        where: {
            AND: [scope, byIdOrPublicId(idOrComplaintId)],
        },
        include: {
            department: { select: { id: true, name: true, code: true, type: true } },
            assignedOfficer: { select: { id: true, name: true, email: true } },
            jurisdiction: { select: { id: true, name: true, level: true } },
            citizen: { select: { id: true, name: true, phone: true, preferredLanguage: true } },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true } },
            duplicates: { select: { complaintId: true, createdAt: true } },
        },
    });
    if (!complaint)
        throw (0, errors_1.notFound)('Complaint not found or not in your scope');
    const updates = await prisma_1.prisma.complaintUpdate.findMany({
        where: { complaintId: complaint.id },
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { name: true, role: true } } },
    });
    const assignments = await prisma_1.prisma.assignment.findMany({
        where: { complaintId: complaint.id },
        orderBy: { createdAt: 'asc' },
        include: {
            department: { select: { name: true } },
            assignedBy: { select: { name: true } },
        },
    });
    return {
        complaint: {
            ...complaint,
            citizenName: complaint.citizen.name,
            trackingHashPresent: Boolean(complaint.trackingHash),
            trackingHash: undefined,
            aiProvider: complaint.aiProvider,
        },
        updates: updates.map((u) => ({
            id: u.id,
            kind: u.kind,
            fromStatus: u.fromStatus,
            toStatus: u.toStatus,
            note: u.note,
            isPublic: u.isPublic,
            actorName: u.actor?.name ?? null,
            actorRole: u.actor?.role ?? 'SYSTEM',
            createdAt: u.createdAt,
        })),
        assignments,
    };
}
async function changeStatus(user, id, status, note, ip) {
    const scope = await officerScope(user);
    const complaint = await prisma_1.prisma.complaint.findFirst({
        where: { AND: [scope, byIdOrPublicId(id)] },
        select: { id: true, complaintId: true, status: true, departmentId: true, citizenId: true },
    });
    if (!complaint)
        throw (0, errors_1.notFound)('Complaint not found or not in your scope');
    const allowed = constants_1.STATUS_TRANSITIONS[complaint.status];
    if (!allowed.includes(status)) {
        throw (0, errors_1.badRequest)(`Invalid status transition: ${complaint.status} → ${status}. Allowed: ${allowed.join(', ') || 'none (terminal)'}`);
    }
    if (status === 'RESOLVED' && !note?.trim()) {
        throw (0, errors_1.badRequest)('A resolution note is required when resolving a complaint');
    }
    const citizen = await prisma_1.prisma.citizen.findUnique({
        where: { id: complaint.citizenId },
        select: { userId: true },
    });
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const c = await tx.complaint.update({
            where: { id: complaint.id },
            data: {
                status,
                resolvedAt: status === 'RESOLVED' ? new Date() : null,
            },
        });
        await tx.complaintUpdate.create({
            data: {
                complaintId: complaint.id,
                kind: 'STATUS',
                fromStatus: complaint.status,
                toStatus: status,
                note: note?.trim() || null,
                isPublic: true,
                actorId: user.id,
            },
        });
        const staff = await (0, service_3.staffOfDepartment)(c.departmentId, tx);
        await (0, service_3.notify)(staff, 'STATUS_CHANGED', `${complaint.complaintId} → ${status}`, note?.trim() || `Status changed from ${complaint.status} to ${status}.`, complaint.id, tx);
        if (citizen?.userId) {
            await (0, service_3.notify)([citizen.userId], 'STATUS_CHANGED', `Your complaint ${complaint.complaintId} is now ${status}`, note?.trim() || `Status updated to ${status}.`, complaint.id, tx);
        }
        return c;
    });
    await (0, service_1.audit)({
        actorId: user.id,
        action: 'COMPLAINT_STATUS_CHANGED',
        entityType: 'Complaint',
        entityId: complaint.id,
        metadata: { from: complaint.status, to: status },
        ip,
    });
    void (0, service_2.evaluateEscalations)(true);
    return updated;
}
async function assignComplaint(user, id, input, ip) {
    if (user.role === 'DEPARTMENT_OFFICER') {
        throw (0, errors_1.forbidden)('Officers cannot reassign complaints');
    }
    const scope = await officerScope(user);
    const complaint = await prisma_1.prisma.complaint.findFirst({
        where: { AND: [scope, byIdOrPublicId(id)] },
        select: { id: true, complaintId: true, status: true, departmentId: true },
    });
    if (!complaint)
        throw (0, errors_1.notFound)('Complaint not found or not in your scope');
    let departmentId = input.departmentId ?? complaint.departmentId;
    if (input.departmentId) {
        const dep = await prisma_1.prisma.department.findFirst({
            where: { id: input.departmentId, active: true },
            select: { id: true, name: true },
        });
        if (!dep)
            throw (0, errors_1.badRequest)('Target department does not exist or is inactive');
        departmentId = dep.id;
    }
    let officerId = null;
    if (input.officerId) {
        const officer = await prisma_1.prisma.user.findFirst({
            where: {
                id: input.officerId,
                isActive: true,
                role: { in: ['DEPARTMENT_OFFICER', 'DEPARTMENT_ADMIN'] },
                departmentId: departmentId ?? undefined,
            },
            select: { id: true, name: true },
        });
        if (!officer) {
            throw (0, errors_1.badRequest)('Officer must be active and belong to the assigned department');
        }
        officerId = officer.id;
    }
    const nextStatus = complaint.status === 'SUBMITTED' || complaint.status === 'ACKNOWLEDGED'
        ? 'ASSIGNED'
        : complaint.status;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        await tx.complaint.update({
            where: { id: complaint.id },
            data: { departmentId, assignedOfficerId: officerId, status: nextStatus },
        });
        await tx.assignment.create({
            data: {
                complaintId: complaint.id,
                departmentId: departmentId ?? null,
                officerId,
                assignedById: user.id,
                reason: input.note?.trim() ?? null,
            },
        });
        await tx.complaintUpdate.create({
            data: {
                complaintId: complaint.id,
                kind: 'ASSIGNMENT',
                fromStatus: complaint.status,
                toStatus: nextStatus,
                note: input.note?.trim() ?? null,
                isPublic: true,
                actorId: user.id,
            },
        });
        const staff = await (0, service_3.staffOfDepartment)(departmentId, tx);
        await (0, service_3.notify)(officerId ? [officerId, ...staff] : staff, officerId ? 'ASSIGNED' : 'REASSIGNED', `${complaint.complaintId} assigned`, input.note?.trim() ?? 'A complaint has been assigned to your department.', complaint.id, tx);
    });
    await (0, service_1.audit)({
        actorId: user.id,
        action: 'COMPLAINT_ASSIGNED',
        entityType: 'Complaint',
        entityId: complaint.id,
        metadata: { departmentId, officerId },
        ip,
    });
    return result;
}
async function addComplaintUpdate(user, id, input, ip) {
    const scope = await officerScope(user);
    const complaint = await prisma_1.prisma.complaint.findFirst({
        where: { AND: [scope, byIdOrPublicId(id)] },
        select: {
            id: true, complaintId: true, status: true, departmentId: true, citizenId: true,
        },
    });
    if (!complaint)
        throw (0, errors_1.notFound)('Complaint not found or not in your scope');
    const { kind } = input;
    if (!['NOTE', 'INFO_REQUEST', 'RESOLUTION', 'ESCALATION'].includes(kind)) {
        throw (0, errors_1.badRequest)(`Unsupported update kind: ${kind}`);
    }
    const note = (kind === 'RESOLUTION' ? input.resolutionNote : input.note)?.trim();
    if (!note) {
        throw (0, errors_1.badRequest)(kind === 'RESOLUTION'
            ? 'resolutionNote is required to record a resolution'
            : 'note is required');
    }
    const citizen = await prisma_1.prisma.citizen.findUnique({
        where: { id: complaint.citizenId },
        select: { userId: true },
    });
    const isPublic = kind !== 'NOTE';
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.complaintUpdate.create({
            data: {
                complaintId: complaint.id,
                kind,
                note,
                isPublic,
                actorId: user.id,
                ...(kind === 'RESOLUTION'
                    ? { toStatus: 'RESOLVED' }
                    : kind === 'ESCALATION'
                        ? { toStatus: 'ESCALATED' }
                        : kind === 'INFO_REQUEST'
                            ? { toStatus: 'AWAITING_CITIZEN_INFO' }
                            : {}),
            },
        });
        if (kind === 'RESOLUTION') {
            await tx.complaint.update({
                where: { id: complaint.id },
                data: { status: 'RESOLVED', resolvedAt: new Date(), resolutionNote: note },
            });
        }
        else if (kind === 'ESCALATION') {
            await tx.complaint.update({
                where: { id: complaint.id },
                data: { status: 'ESCALATED' },
            });
        }
        else if (kind === 'INFO_REQUEST') {
            await tx.complaint.update({
                where: { id: complaint.id },
                data: { status: 'AWAITING_CITIZEN_INFO' },
            });
        }
        const staff = await (0, service_3.staffOfDepartment)(complaint.departmentId, tx);
        const type = kind === 'RESOLUTION' ? 'RESOLVED'
            : kind === 'ESCALATION' ? 'ESCALATED'
                : kind === 'INFO_REQUEST' ? 'INFO_REQUESTED'
                    : 'STATUS_CHANGED';
        const title = kind === 'RESOLUTION' ? `${complaint.complaintId} resolved`
            : kind === 'ESCALATION' ? `${complaint.complaintId} escalated`
                : kind === 'INFO_REQUEST' ? `More info needed for ${complaint.complaintId}`
                    : `Internal note on ${complaint.complaintId}`;
        await (0, service_3.notify)(staff, type, title, note, complaint.id, tx);
        if (isPublic && citizen?.userId) {
            await (0, service_3.notify)([citizen.userId], type, title, note, complaint.id, tx);
        }
    });
    await (0, service_1.audit)({
        actorId: user.id,
        action: `COMPLAINT_UPDATE_${kind}`,
        entityType: 'Complaint',
        entityId: complaint.id,
        ip,
    });
    if (kind === 'ESCALATION')
        void (0, service_2.evaluateEscalations)(true);
    return { ok: true };
}
async function linkDuplicate(user, id, duplicateOfId, ip) {
    const scope = await officerScope(user);
    const complaint = await prisma_1.prisma.complaint.findFirst({
        where: { AND: [scope, byIdOrPublicId(id)] },
        select: { id: true, complaintId: true },
    });
    if (!complaint)
        throw (0, errors_1.notFound)('Complaint not found or not in your scope');
    const target = await prisma_1.prisma.complaint.findUnique({
        where: { complaintId: duplicateOfId },
        select: { id: true, complaintId: true },
    });
    if (!target)
        throw (0, errors_1.badRequest)('Target complaint ID does not exist');
    if (target.id === complaint.id)
        throw (0, errors_1.badRequest)('A complaint cannot duplicate itself');
    await prisma_1.prisma.$transaction(async (tx) => {
        // Link only — individual citizen reports are never deleted.
        await tx.complaint.update({
            where: { id: complaint.id },
            data: { duplicateOfId: target.id },
        });
        await tx.complaintUpdate.create({
            data: {
                complaintId: complaint.id,
                kind: 'DUPLICATE_LINK',
                note: `Linked as duplicate of ${target.complaintId}. Both reports are retained.`,
                isPublic: false,
                actorId: user.id,
            },
        });
    });
    await (0, service_1.audit)({
        actorId: user.id,
        action: 'COMPLAINT_DUPLICATE_LINKED',
        entityType: 'Complaint',
        entityId: complaint.id,
        metadata: { duplicateOf: target.complaintId },
        ip,
    });
    return { ok: true };
}
/** Public tracking: identical 404 for wrong ID and wrong token (no probing). */
async function trackComplaint(input) {
    const complaint = await prisma_1.prisma.complaint.findUnique({
        where: { complaintId: input.complaintId },
        select: {
            id: true, complaintId: true, status: true, category: true, priority: true,
            district: true, taluk: true, city: true, landmark: true, language: true,
            createdAt: true, resolvedAt: true, trackingHash: true, isDemo: true,
            department: { select: { name: true } },
            citizen: { select: { id: true, userId: true } },
        },
    });
    // Same generic error either way — prevents ID enumeration.
    const generic = (0, errors_1.notFound)('No complaint matches that ID and tracking token');
    if (!complaint)
        throw generic;
    let authorized = false;
    if (input.trackingToken) {
        authorized = (0, crypto_1.safeEqual)((0, crypto_1.hashTrackingToken)(input.trackingToken), complaint.trackingHash);
    }
    if (!authorized && input.userId) {
        authorized = complaint.citizen.userId === input.userId;
    }
    if (!authorized)
        throw generic;
    const updates = await prisma_1.prisma.complaintUpdate.findMany({
        where: { complaintId: complaint.id, isPublic: true },
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { role: true } } },
    });
    const statusHistory = updates
        .filter((u) => u.kind === 'STATUS' || u.kind === 'ASSIGNMENT' || u.kind === 'ESCALATION')
        .map((u) => ({
        status: (u.toStatus ?? complaint.status),
        note: u.note,
        at: u.createdAt,
        byRole: u.actor?.role ?? 'SYSTEM',
    }));
    // Complaints registered through chat already log their own SUBMITTED entry;
    // only add the baseline row when nothing recorded the submission.
    const hasSubmittedEntry = updates.some((u) => u.kind === 'STATUS' && u.toStatus === 'SUBMITTED');
    if (!hasSubmittedEntry) {
        statusHistory.unshift({
            status: 'SUBMITTED',
            note: null,
            at: complaint.createdAt,
            byRole: 'SYSTEM',
        });
    }
    const publicUpdates = updates
        .filter((u) => constants_1.PUBLIC_UPDATE_KINDS.includes(u.kind) && u.kind !== 'STATUS' &&
        Boolean(u.note))
        .map((u) => ({ kind: u.kind, note: u.note, at: u.createdAt }));
    return {
        complaint: {
            complaintId: complaint.complaintId,
            status: complaint.status,
            category: complaint.category,
            categoryLabel: constants_1.CATEGORY_MAP.get(complaint.category)?.label ?? null,
            priority: complaint.priority,
            district: complaint.district,
            taluk: complaint.taluk,
            city: complaint.city,
            landmark: complaint.landmark,
            departmentName: complaint.department?.name ?? null,
            submittedAt: complaint.createdAt,
            resolvedAt: complaint.resolvedAt,
            language: complaint.language,
            isDemo: complaint.isDemo,
            history: statusHistory,
            publicUpdates,
        },
    };
}
async function complaintMapPoints(user, scopeType, filters) {
    const where = {
        AND: [
            filters.category ? { category: filters.category } : {},
            filters.status ? { status: filters.status } : {},
        ],
    };
    if (scopeType === 'public') {
        const andClause = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        const grouped = await prisma_1.prisma.complaint.groupBy({
            by: ['district', 'category', 'status'],
            where: { AND: [{ district: { not: null } }, ...andClause] },
            _count: { _all: true },
        });
        const districts = await prisma_1.prisma.jurisdiction.findMany({
            where: { level: 'DISTRICT', active: true },
            select: { name: true, latitude: true, longitude: true },
        });
        const coords = new Map(districts.map((d) => [d.name.toLowerCase(), d]));
        return {
            points: grouped
                .filter((g) => g.district)
                .map((g) => {
                const c = coords.get(g.district.toLowerCase());
                return {
                    district: g.district,
                    category: g.category,
                    status: g.status,
                    priority: null,
                    count: g._count._all,
                    latitude: c?.latitude ?? null,
                    longitude: c?.longitude ?? null,
                };
            })
                .filter((p) => p.latitude != null && p.longitude != null),
        };
    }
    // admin scope — per-complaint points within the caller's visibility scope
    if (!user)
        throw (0, errors_1.notFound)();
    const scope = await officerScope(user);
    const andClause = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    const complaints = await prisma_1.prisma.complaint.findMany({
        where: { AND: [scope, ...andClause] },
        select: {
            complaintId: true, category: true, status: true, priority: true,
            district: true, latitude: true, longitude: true,
            department: { select: { name: true } },
        },
        take: 2000,
    });
    const districts = await prisma_1.prisma.jurisdiction.findMany({
        where: { level: 'DISTRICT', active: true },
        select: { name: true, latitude: true, longitude: true },
    });
    const coords = new Map(districts.map((d) => [d.name.toLowerCase(), d]));
    return {
        points: complaints.map((c) => ({
            complaintId: c.complaintId,
            category: c.category,
            status: c.status,
            priority: c.priority,
            district: c.district,
            latitude: c.latitude ?? (c.district ? coords.get(c.district.toLowerCase())?.latitude ?? null : null),
            longitude: c.longitude ?? (c.district ? coords.get(c.district.toLowerCase())?.longitude ?? null : null),
            departmentName: c.department?.name ?? null,
        })).filter((p) => p.latitude != null && p.longitude != null),
    };
}
async function superAdminOrThrow(user) {
    if (user.role !== 'SUPER_ADMIN')
        throw (0, errors_1.forbidden)('Super administrator only');
    void (0, service_3.superAdminIds)();
}
//# sourceMappingURL=service.js.map