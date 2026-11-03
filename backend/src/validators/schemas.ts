/** Zod request schemas — every mutating endpoint validates its input. */
import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const createConversationSchema = z.object({
  language: z.enum(['en', 'kn', 'hi']).nullable().optional(),
});

export const postMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  language: z.enum(['en', 'kn', 'hi']).nullable().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string().uuid(),
        url: z.string().max(300),
        filename: z.string().max(255),
      }),
    )
    .max(5)
    .optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      label: z.string().max(200).optional(),
    })
    .optional(),
});

export const confirmSchema = z.object({
  confirm: z.literal(true),
});

export const trackSchema = z.object({
  complaintId: z
    .string()
    .trim()
    .regex(/^CCAI-\d{4}-\d{6}$/, 'Format: CCAI-YYYY-NNNNNN'),
  trackingToken: z.string().trim().min(10).max(200).optional(),
});

export const listComplaintsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().max(60).optional(),
  departmentId: z.string().uuid().optional(),
  district: z.string().max(100).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z
    .enum([
      'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
      'AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED',
    ])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const statusChangeSchema = z.object({
  status: z.enum([
    'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS',
    'AWAITING_CITIZEN_INFO', 'RESOLVED', 'REJECTED', 'ESCALATED',
  ]),
  note: z.string().trim().max(2000).optional(),
});

export const assignSchema = z.object({
  departmentId: z.string().uuid().optional(),
  officerId: z.string().uuid().optional(),
  note: z.string().trim().max(2000).optional(),
});

export const complaintUpdateSchema = z.object({
  kind: z.enum(['NOTE', 'INFO_REQUEST', 'RESOLUTION', 'ESCALATION']),
  note: z.string().trim().max(2000).optional(),
  resolutionNote: z.string().trim().max(4000).optional(),
});

export const duplicateSchema = z.object({
  duplicateOfId: z
    .string()
    .trim()
    .regex(/^CCAI-\d{4}-\d{6}$/),
});

export const departmentCreateSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(3).max(160),
  type: z.enum([
    'ULB_CORPORATION', 'ULB_MUNICIPAL_COUNCIL', 'ULB_TOWN_PANCHAYAT',
    'PWD', 'RDPR', 'WATER', 'POWER', 'HEALTH', 'FIRE', 'TRANSPORT',
    'POLLUTION', 'ANIMAL_WELFARE', 'TRIAGE', 'OTHER',
  ]),
  description: z.string().trim().max(1000).optional(),
  categories: z.array(z.string().max(60)).min(1).max(20),
  jurisdictionLevel: z.enum(['STATE', 'DISTRICT', 'TALUK', 'LOCAL_BODY', 'WARD']),
  district: z.string().trim().max(100).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactWebsite: z.string().url().nullable().optional(),
});

export const departmentPatchSchema = departmentCreateSchema.partial();

export const jurisdictionCreateSchema = z.object({
  level: z.enum(['STATE', 'DISTRICT', 'TALUK', 'LOCAL_BODY', 'WARD']),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(40).optional(),
  parentId: z.string().uuid().nullable().optional(),
  district: z.string().trim().max(100).nullable().optional(),
  taluk: z.string().trim().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const officerCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER']),
  departmentId: z.string().uuid(),
  jurisdictionId: z.string().uuid().nullable().optional(),
});

export const officerPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER', 'SUPER_ADMIN']).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  jurisdictionId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

export const categoryPatchSchema = z.object({
  label: z
    .object({
      en: z.string().min(1).max(120),
      kn: z.string().min(1).max(160),
      hi: z.string().min(1).max(160),
    })
    .optional(),
  description: z.record(z.string(), z.string()).optional(),
  icon: z.string().max(60).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const escalationRuleSchema = z.object({
  name: z.string().trim().min(3).max(120),
  category: z.string().max(60).nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).nullable().optional(),
  hoursToEscalate: z.number().int().min(1).max(24 * 90),
  targetDepartmentId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

export const notificationsReadSchema = z.object({
  ids: z.union([z.array(z.string().uuid()).max(100), z.literal('all')]),
});
