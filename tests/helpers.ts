/** Shared test helpers: app instance, auth tokens, fixture factories. */
import { randomUUID } from 'crypto';
import request from 'supertest';
import { createApp } from '../src/server';
import { prisma } from '../src/config/prisma';
import { hashTrackingToken, signSession } from '../src/utils/crypto';
import { generateComplaintId } from '../src/utils/complaintId';

export const app = createApp();
export const ORIGIN = 'http://localhost:5173';
/** Cookie-jar agent: the guest chat session is carried in an httpOnly
 *  `ccai_guest` cookie, so conversation calls must reuse the same jar. */
export const agent = request.agent(app);
/** Bearer tokens bypass the Origin/CSRF check — used for staff API calls. */
export const bearer = (userId: string, role: string, name = 'Test User'): string =>
  `Bearer ${signSession({ sub: userId, role, name })}`;

export const getUser = (email: string) =>
  prisma.user.findUniqueOrThrow({ where: { email } });

export const getDept = (code: string) =>
  prisma.department.findUniqueOrThrow({ where: { code } });

/** Minimal valid AIUnderstanding for routing unit tests. */
export const makeUnderstanding = (
  overrides: Partial<Record<string, unknown>> = {},
): never => {
  const base = {
    original_text: 'test complaint text',
    detected_language: 'en',
    normalized_description: 'test complaint text',
    category: 'road_damage',
    category_label: { en: 'Roads and Potholes' },
    entities: {},
    priority: 'medium',
    safety_risk: false,
    emergency: false,
    recommended_department: '',
    confidence: 0.9,
    reasoning: 'unit test',
    requires_manual_review: false,
    ai_provider: 'demo',
    classification_method: 'rules',
    ...overrides,
  };
  return base as never;
};

export interface ComplaintOpts {
  status?: 'SUBMITTED' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'AWAITING_CITIZEN_INFO' | 'RESOLVED' | 'REJECTED' | 'ESCALATED';
  category?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  district?: string;
  departmentId?: string | null;
  assignedOfficerId?: string | null;
  text?: string;
  email?: string;
}

/** Create a fresh complaint owned by a throwaway citizen. */
export async function makeComplaint(opts: ComplaintOpts = {}) {
  const email = opts.email ?? `citizen-${randomUUID().slice(0, 8)}@civicconnect.test`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: 'x', name: 'Test Citizen', role: 'CITIZEN' },
  });
  const citizen = await prisma.citizen.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, name: user.name },
  });
  const complaintId = await generateComplaintId();
  const trackingToken = `test-track-${randomUUID()}`;
  const text = opts.text ?? 'Test complaint text for unit tests';
  const complaint = await prisma.complaint.create({
    data: {
      complaintId,
      citizenId: citizen.id,
      originalText: text,
      normalizedText: text.toLowerCase(),
      summary: text,
      language: 'en',
      category: opts.category ?? 'road_damage',
      priority: opts.priority ?? 'MEDIUM',
      status: opts.status ?? 'SUBMITTED',
      district: opts.district ?? 'Bengaluru Urban',
      departmentId: opts.departmentId === undefined ? null : opts.departmentId,
      assignedOfficerId: opts.assignedOfficerId ?? null,
      aiConfidence: 0.9,
      aiReasoning: 'test',
      aiProvider: 'demo',
      trackingHash: hashTrackingToken(trackingToken),
      isDemo: false,
    },
  });
  return { complaint, trackingToken, user, citizen };
}

/** Create a conversation via the API (guest flow) and return its id.
 *  Uses the cookie-jar agent so later message calls carry the guest cookie. */
export async function newConversation(language: string | null = null): Promise<string> {
  const res = await agent
    .post('/api/chat/conversations')
    .set('Origin', ORIGIN)
    .send({ language });
  if (res.status !== 201) {
    throw new Error(`conversation create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.conversation.id as string;
}

/** Drive chat until needs_confirmation or max turns. */
export async function chatUntilConfirmation(convId: string, opening: string) {
  const transcript: { role: string; content: string }[] = [];
  let last: Record<string, any> = {};
  const replies = ['Bengaluru Urban', 'road damage', 'Koramangala, Bengaluru'];
  let i = 0;
  for (; i < 12; i++) {
    const content = i === 0 ? opening : replies[Math.min(i - 1, replies.length - 1)];
    const res = await agent
      .post(`/api/chat/conversations/${convId}/messages`)
      .set('Origin', ORIGIN)
      .send({ content });
    if (res.status !== 200) {
      throw new Error(`chat failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    transcript.push({ role: 'user', content });
    transcript.push({ role: 'assistant', content: res.body.assistantMessage.content });
    last = res.body;
    if (res.body.needsConfirmation) break;
  }
  return { last, turns: i + 1, transcript };
}
