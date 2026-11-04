/** Complaint management controller (staff only — scope enforced in service). */
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireRole } from '../middleware/auth';
import {
  addComplaintUpdate,
  assignComplaint,
  changeStatus,
  getComplaintDetail,
  linkDuplicate,
  listComplaints,
} from '../services/complaints/service';
import {
  assignSchema,
  complaintUpdateSchema,
  duplicateSchema,
  listComplaintsQuerySchema,
  statusChangeSchema,
} from '../validators/schemas';

export const list = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = listComplaintsQuerySchema.parse(req.query);
    res.json(await listComplaints(req.user!, filters));
  }),
];

export const detail = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await getComplaintDetail(req.user!, req.params.id));
  }),
];

export const status = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = statusChangeSchema.parse(req.body);
    await changeStatus(req.user!, req.params.id, input.status, input.note, req.ip);
    res.json({ ok: true });
  }),
];

export const assign = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = assignSchema.parse(req.body);
    if (!input.departmentId && !input.officerId) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'departmentId or officerId required', details: [] },
      });
      return;
    }
    await assignComplaint(req.user!, req.params.id, input, req.ip);
    res.json({ ok: true });
  }),
];

export const update = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = complaintUpdateSchema.parse(req.body);
    await addComplaintUpdate(req.user!, req.params.id, input, req.ip);
    res.status(201).json({ ok: true });
  }),
];

export const duplicate = [
  requireRole('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'),
  asyncHandler(async (req: Request, res: Response) => {
    const input = duplicateSchema.parse(req.body);
    await linkDuplicate(req.user!, req.params.id, input.duplicateOfId, req.ip);
    res.json({ ok: true });
  }),
];
