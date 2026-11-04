/** Node.js → Python AI service client.
 *  Authenticated internal REST calls with timeout, structured errors and
 *  strict response validation (never trusts arbitrary AI output). */
import { z } from 'zod';
import { env } from '../../config/env';
import { aiServiceError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const TIMEOUT_MS = 25_000;

const EntitiesSchema = z
  .object({
    district: z.string().nullish(),
    taluk: z.string().nullish(),
    city: z.string().nullish(),
    ward: z.string().nullish(),
    landmark: z.string().nullish(),
    local_body: z.string().nullish(),
    road_type: z.enum(['urban', 'highway', 'rural']).nullish(),
    duration_days: z.number().int().min(0).max(3650).nullish(),
    problem_type: z.string().nullish(),
    safety_details: z.string().nullish(),
  })
  .passthrough();

export const AIUnderstandingSchema = z
  .object({
    original_text: z.string(),
    detected_language: z.string(),
    normalized_description: z.string(),
    category: z.string(),
    category_label: z.record(z.string(), z.string()),
    entities: EntitiesSchema,
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    safety_risk: z.boolean(),
    emergency: z.boolean(),
    recommended_department: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
    requires_manual_review: z.boolean(),
    ai_provider: z.string(),
    classification_method: z.string().optional(),
  })
  .passthrough();

export const ConversationStateSchema = z
  .object({
    slots: z.record(z.string(), z.unknown()).default({}),
    missing: z.array(z.string()).default([]),
    understanding: AIUnderstandingSchema.nullish(),
    turn: z.number().int().default(0),
    emergencyHandled: z.boolean().default(false),
    awaitingConfirmation: z.boolean().default(false),
    askedCategories: z.boolean().default(false),
    askedRoadType: z.boolean().default(false),
    askedLocationTimes: z.number().int().default(0),
  })
  .passthrough();

export const ChatResponseSchema = z
  .object({
    detected_language: z.string(),
    language_confidence: z.number(),
    reply: z.string(),
    understanding: AIUnderstandingSchema.nullish(),
    slots: z.record(z.string(), z.unknown()),
    state: ConversationStateSchema,
    missing_slots: z.array(z.string()),
    next_action: z.enum([
      'ASK_LOCATION', 'ASK_CATEGORY', 'ASK_CONFIRM', 'CLARIFY',
      'EMERGENCY', 'SMALLTALK', 'REGISTER',
    ]),
    needs_confirmation: z.boolean(),
    confirmation_summary: z.string().nullish(),
    emergency: z
      .object({
        is_emergency: z.boolean(),
        guidance: z.string().nullish(),
        call_number: z.string().default('112'),
      })
      .default({ is_emergency: false, guidance: null, call_number: '112' }),
    suggested_replies: z.array(z.string()).default([]),
    ai_provider: z.string(),
  })
  .passthrough();

export type AIUnderstanding = z.infer<typeof AIUnderstandingSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ConversationState = z.infer<typeof ConversationStateSchema>;

async function call<T>(
  path: string,
  body: unknown,
  // Input typed as unknown so schemas with .default() still infer their OUTPUT type
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${env.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': env.aiServiceKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      let detail = `status ${resp.status}`;
      try {
        const errBody = (await resp.json()) as { error?: { message?: string } };
        if (errBody?.error?.message) detail = errBody.error.message;
      } catch { /* keep status detail */ }
      logger.warn('ai_service_error', { path, status: resp.status, detail });
      throw aiServiceError(
        resp.status === 401
          ? 'AI service rejected the service key — check AI_SERVICE_KEY on both services'
          : `AI service request failed (${detail}). The chatbot can retry, or run with AI_PROVIDER=demo.`,
      );
    }
    const data = (await resp.json()) as unknown;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      logger.error('ai_response_invalid', {
        path,
        issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      throw aiServiceError(
        'AI service returned an invalid response shape. Check that the Python service version matches the backend.',
      );
    }
    return parsed.data;
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'AI_SERVICE_ERROR') {
      throw err;
    }
    if ((err as Error).name === 'AbortError') {
      logger.warn('ai_service_timeout', { path });
      throw aiServiceError('AI service timed out after 25s. Please try again.');
    }
    logger.warn('ai_service_unreachable', { path, message: String((err as Error).message) });
    throw aiServiceError(
      `Unable to reach the Python AI service at ${env.aiServiceUrl}. Start it with: npm run dev --prefix ai-service`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const aiChat = (input: {
  message: string;
  language: string | null;
  history: ChatTurn[];
  state: ConversationState;
}): Promise<ChatResponse> =>
  call('/api/v1/ai/chat', input, ChatResponseSchema);

export const aiHealth = async (): Promise<{ status: string; provider: string } | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${env.aiServiceUrl}/health`, {
      headers: { 'X-Service-Key': env.aiServiceKey },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    return (await resp.json()) as { status: string; provider: string };
  } catch {
    return null;
  }
};
