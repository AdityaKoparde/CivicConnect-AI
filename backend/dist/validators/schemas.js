"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsReadSchema = exports.escalationRuleSchema = exports.categoryPatchSchema = exports.officerPatchSchema = exports.officerCreateSchema = exports.jurisdictionCreateSchema = exports.departmentPatchSchema = exports.departmentCreateSchema = exports.duplicateSchema = exports.complaintUpdateSchema = exports.assignSchema = exports.statusChangeSchema = exports.listComplaintsQuerySchema = exports.trackSchema = exports.confirmSchema = exports.postMessageSchema = exports.createConversationSchema = exports.loginSchema = exports.registerSchema = exports.passwordSchema = exports.emailSchema = void 0;
/** Zod request schemas — every mutating endpoint validates its input. */
const zod_1 = require("zod");
exports.emailSchema = zod_1.z.string().trim().toLowerCase().email().max(254);
exports.passwordSchema = zod_1.z.string().min(8).max(128);
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
    name: zod_1.z.string().trim().min(2).max(120),
    phone: zod_1.z.string().trim().max(20).optional().or(zod_1.z.literal('')),
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1).max(128),
});
exports.createConversationSchema = zod_1.z.object({
    language: zod_1.z.enum(['en', 'kn', 'hi']).nullable().optional(),
});
exports.postMessageSchema = zod_1.z.object({
    content: zod_1.z.string().trim().min(1).max(4000),
    language: zod_1.z.enum(['en', 'kn', 'hi']).nullable().optional(),
    attachments: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        url: zod_1.z.string().max(300),
        filename: zod_1.z.string().max(255),
    }))
        .max(5)
        .optional(),
    location: zod_1.z
        .object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        label: zod_1.z.string().max(200).optional(),
    })
        .optional(),
});
exports.confirmSchema = zod_1.z.object({
    confirm: zod_1.z.literal(true),
});
exports.trackSchema = zod_1.z.object({
    complaintId: zod_1.z
        .string()
        .trim()
        .regex(/^CCAI-\d{4}-\d{6}$/, 'Format: CCAI-YYYY-NNNNNN'),
    trackingToken: zod_1.z.string().trim().min(10).max(200).optional(),
});
exports.listComplaintsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().max(200).optional(),
    category: zod_1.z.string().max(60).optional(),
    departmentId: zod_1.z.string().uuid().optional(),
    district: zod_1.z.string().max(100).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: zod_1.z
        .enum([
        'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
        'AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED',
    ])
        .optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
exports.statusChangeSchema = zod_1.z.object({
    status: zod_1.z.enum([
        'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
        'AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED',
    ]),
    note: zod_1.z.string().trim().max(2000).optional(),
});
exports.assignSchema = zod_1.z.object({
    departmentId: zod_1.z.string().uuid().optional(),
    officerId: zod_1.z.string().uuid().optional(),
    note: zod_1.z.string().trim().max(2000).optional(),
});
exports.complaintUpdateSchema = zod_1.z.object({
    kind: zod_1.z.enum(['NOTE', 'INFO_REQUEST', 'RESOLUTION', 'ESCALATION']),
    note: zod_1.z.string().trim().max(2000).optional(),
    resolutionNote: zod_1.z.string().trim().max(4000).optional(),
});
exports.duplicateSchema = zod_1.z.object({
    duplicateOfId: zod_1.z
        .string()
        .trim()
        .regex(/^CCAI-\d{4}-\d{6}$/),
});
exports.departmentCreateSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
    name: zod_1.z.string().trim().min(3).max(160),
    type: zod_1.z.enum([
        'ULB_CORPORATION', 'ULB_MUNICIPAL_COUNCIL', 'ULB_TOWN_PANCHAYAT',
        'PWD', 'RDPR', 'WATER', 'POWER', 'HEALTH', 'FIRE', 'TRANSPORT',
        'POLLUTION', 'ANIMAL_WELFARE', 'TRIAGE', 'OTHER',
    ]),
    description: zod_1.z.string().trim().max(1000).optional(),
    categories: zod_1.z.array(zod_1.z.string().max(60)).min(1).max(20),
    jurisdictionLevel: zod_1.z.enum(['STATE', 'DISTRICT', 'TALUK', 'LOCAL_BODY', 'WARD']),
    district: zod_1.z.string().trim().max(100).nullable().optional(),
    parentId: zod_1.z.string().uuid().nullable().optional(),
    contactEmail: zod_1.z.string().email().nullable().optional(),
    contactWebsite: zod_1.z.string().url().nullable().optional(),
});
exports.departmentPatchSchema = exports.departmentCreateSchema.partial();
exports.jurisdictionCreateSchema = zod_1.z.object({
    level: zod_1.z.enum(['STATE', 'DISTRICT', 'TALUK', 'LOCAL_BODY', 'WARD']),
    name: zod_1.z.string().trim().min(2).max(120),
    code: zod_1.z.string().trim().max(40).optional(),
    parentId: zod_1.z.string().uuid().nullable().optional(),
    district: zod_1.z.string().trim().max(100).nullable().optional(),
    taluk: zod_1.z.string().trim().max(100).nullable().optional(),
    latitude: zod_1.z.number().min(-90).max(90).nullable().optional(),
    longitude: zod_1.z.number().min(-180).max(180).nullable().optional(),
});
exports.officerCreateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    email: exports.emailSchema,
    password: exports.passwordSchema,
    role: zod_1.z.enum(['DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER']),
    departmentId: zod_1.z.string().uuid(),
    jurisdictionId: zod_1.z.string().uuid().nullable().optional(),
});
exports.officerPatchSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120).optional(),
    role: zod_1.z.enum(['DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER', 'SUPER_ADMIN']).optional(),
    departmentId: zod_1.z.string().uuid().nullable().optional(),
    jurisdictionId: zod_1.z.string().uuid().nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    password: exports.passwordSchema.optional(),
});
exports.categoryPatchSchema = zod_1.z.object({
    label: zod_1.z
        .object({
        en: zod_1.z.string().min(1).max(120),
        kn: zod_1.z.string().min(1).max(160),
        hi: zod_1.z.string().min(1).max(160),
    })
        .optional(),
    description: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    icon: zod_1.z.string().max(60).optional(),
    active: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).max(10000).optional(),
});
exports.escalationRuleSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3).max(120),
    category: zod_1.z.string().max(60).nullable().optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).nullable().optional(),
    hoursToEscalate: zod_1.z.number().int().min(1).max(24 * 90),
    targetDepartmentId: zod_1.z.string().uuid().nullable().optional(),
    active: zod_1.z.boolean().optional(),
});
exports.notificationsReadSchema = zod_1.z.object({
    ids: zod_1.z.union([zod_1.z.array(zod_1.z.string().uuid()).max(100), zod_1.z.literal('all')]),
});
//# sourceMappingURL=schemas.js.map