/** Chat controller — conversation lifecycle + the explicit confirm gate. */
import { Request, Response } from 'express';
import { GUEST_COOKIE } from '../config/constants';
import { asyncHandler } from '../utils/asyncHandler';
import { unauthenticated } from '../utils/errors';
import { signGuest, verifyGuest } from '../utils/crypto';
import {
  cancelConversation,
  confirmComplaint,
  Caller,
  createConversation,
  getConversation,
  postMessage,
} from '../services/chat/service';
import {
  confirmSchema,
  createConversationSchema,
  postMessageSchema,
} from '../validators/schemas';

/** Resolve who is calling: logged-in user or guest-cookie holder. */
export const getCaller = (req: Request): Caller => {
  if (req.user) return { user: req.user };
  const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
  const guestId = cookies?.[GUEST_COOKIE] ? verifyGuest(cookies[GUEST_COOKIE]) : null;
  return guestId ? { guestCitizenId: guestId } : {};
};

const requireCaller = (req: Request): Caller => {
  const caller = getCaller(req);
  if (!caller.user && !caller.guestCitizenId) {
    throw unauthenticated('Sign in or start a conversation first');
  }
  return caller;
};

export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = createConversationSchema.parse(req.body ?? {});
  const caller = getCaller(req);
  if (!caller.user && !caller.guestCitizenId) {
    // Brand-new guest: create an anonymous citizen + signed guest cookie
    const result = await createConversation({}, input.language ?? null);
    if (result.setGuestCitizenId) {
      res.cookie(GUEST_COOKIE, signGuest(result.setGuestCitizenId), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 12 * 3600 * 1000,
        path: '/',
      });
    }
    res.status(201).json({ conversation: result.conversation });
    return;
  }
  const result = await createConversation(caller, input.language ?? null);
  res.status(201).json({ conversation: result.conversation });
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const caller = requireCaller(req);
  const data = await getConversation(caller, req.params.id);
  res.json(data);
});

export const message = asyncHandler(async (req: Request, res: Response) => {
  const caller = requireCaller(req);
  const input = postMessageSchema.parse(req.body);
  const data = await postMessage(caller, req.params.id, input);
  res.json(data);
});

export const confirm = asyncHandler(async (req: Request, res: Response) => {
  const caller = requireCaller(req);
  confirmSchema.parse(req.body);
  const data = await confirmComplaint(caller, req.params.id, req.ip);
  res.status(201).json(data);
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const caller = requireCaller(req);
  const data = await cancelConversation(caller, req.params.id);
  res.json(data);
});
