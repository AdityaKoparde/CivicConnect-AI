/** Public complaint tracking + public map points. */
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { complaintMapPoints, trackComplaint } from '../services/complaints/service';
import { trackSchema } from '../validators/schemas';
import { badRequest } from '../utils/errors';

export const track = asyncHandler(async (req: Request, res: Response) => {
  const input = trackSchema.parse(req.body);
  const data = await trackComplaint({
    complaintId: input.complaintId,
    trackingToken: input.trackingToken,
    userId: req.user?.id,
  });
  res.json(data);
});

export const mapPoints = asyncHandler(async (req: Request, res: Response) => {
  const scope = req.query.scope === 'admin' ? 'admin' : 'public';
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  if (scope === 'admin' && !req.user) throw badRequest('Authentication required for admin map');
  res.json(
    await complaintMapPoints(req.user, scope, { category, status }),
  );
});
