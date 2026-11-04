/** JWT session + tracking-token hashing helpers. */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface SessionPayload {
  sub: string; // user id
  role: string;
  name: string;
}

export const signSession = (payload: SessionPayload): string =>
  jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresInSeconds,
    issuer: 'civicconnect-ai',
  });

export const verifySession = (token: string): SessionPayload | null => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'civicconnect-ai' });
    if (typeof decoded === 'string') return null;
    const { sub, role, name } = decoded as Partial<SessionPayload>;
    if (!sub || !role) return null;
    return { sub, role, name: name ?? '' };
  } catch {
    return null;
  }
};

/** Guest chat sessions (no account) get a signed cookie binding them to a
 *  Citizen row so conversations survive reloads without exposing others' data. */
export const signGuest = (citizenId: string): string =>
  jwt.sign({ sub: `guest:${citizenId}`, role: 'GUEST', name: 'Guest' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresInSeconds,
    issuer: 'civicconnect-ai',
  });

export const verifyGuest = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'civicconnect-ai' });
    if (typeof decoded === 'string') return null;
    const sub = (decoded as { sub?: string }).sub ?? '';
    return sub.startsWith('guest:') ? sub.slice(6) : null;
  } catch {
    return null;
  }
};

/** Raw tracking token is shown to the citizen exactly once. */
export const newTrackingToken = (): string =>
  crypto.randomBytes(24).toString('base64url');

export const hashTrackingToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};
