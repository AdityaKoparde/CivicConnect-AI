"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiHealth = exports.aiChat = exports.ChatResponseSchema = exports.ConversationStateSchema = exports.AIUnderstandingSchema = void 0;
/** Node.js → Python AI service client.
 *  Authenticated internal REST calls with timeout, structured errors and
 *  strict response validation (never trusts arbitrary AI output). */
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
const TIMEOUT_MS = 25_000;
const EntitiesSchema = zod_1.z
    .object({
    district: zod_1.z.string().nullish(),
    taluk: zod_1.z.string().nullish(),
    city: zod_1.z.string().nullish(),
    ward: zod_1.z.string().nullish(),
    landmark: zod_1.z.string().nullish(),
    local_body: zod_1.z.string().nullish(),
    road_type: zod_1.z.enum(['urban', 'highway', 'rural']).nullish(),
    duration_days: zod_1.z.number().int().min(0).max(3650).nullish(),
    problem_type: zod_1.z.string().nullish(),
    safety_details: zod_1.z.string().nullish(),
})
    .passthrough();
exports.AIUnderstandingSchema = zod_1.z
    .object({
    original_text: zod_1.z.string(),
    detected_language: zod_1.z.string(),
    normalized_description: zod_1.z.string(),
    category: zod_1.z.string(),
    category_label: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    entities: EntitiesSchema,
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    safety_risk: zod_1.z.boolean(),
    emergency: zod_1.z.boolean(),
    recommended_department: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    reasoning: zod_1.z.string(),
    requires_manual_review: zod_1.z.boolean(),
    ai_provider: zod_1.z.string(),
    classification_method: zod_1.z.string().optional(),
})
    .passthrough();
exports.ConversationStateSchema = zod_1.z
    .object({
    slots: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    missing: zod_1.z.array(zod_1.z.string()).default([]),
    understanding: exports.AIUnderstandingSchema.nullish(),
    turn: zod_1.z.number().int().default(0),
    emergencyHandled: zod_1.z.boolean().default(false),
    awaitingConfirmation: zod_1.z.boolean().default(false),
    askedCategories: zod_1.z.boolean().default(false),
    askedRoadType: zod_1.z.boolean().default(false),
    askedLocationTimes: zod_1.z.number().int().default(0),
})
    .passthrough();
exports.ChatResponseSchema = zod_1.z
    .object({
    detected_language: zod_1.z.string(),
    language_confidence: zod_1.z.number(),
    reply: zod_1.z.string(),
    understanding: exports.AIUnderstandingSchema.nullish(),
    slots: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    state: exports.ConversationStateSchema,
    missing_slots: zod_1.z.array(zod_1.z.string()),
    next_action: zod_1.z.enum([
        'ASK_LOCATION', 'ASK_CATEGORY', 'ASK_CONFIRM', 'CLARIFY',
        'EMERGENCY', 'SMALLTALK', 'REGISTER',
    ]),
    needs_confirmation: zod_1.z.boolean(),
    confirmation_summary: zod_1.z.string().nullish(),
    emergency: zod_1.z
        .object({
        is_emergency: zod_1.z.boolean(),
        guidance: zod_1.z.string().nullish(),
        call_number: zod_1.z.string().default('112'),
    })
        .default({ is_emergency: false, guidance: null, call_number: '112' }),
    suggested_replies: zod_1.z.array(zod_1.z.string()).default([]),
    ai_provider: zod_1.z.string(),
})
    .passthrough();
async function call(path, body, 
// Input typed as unknown so schemas with .default() still infer their OUTPUT type
schema) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const resp = await fetch(`${env_1.env.aiServiceUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Key': env_1.env.aiServiceKey,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!resp.ok) {
            let detail = `status ${resp.status}`;
            try {
                const errBody = (await resp.json());
                if (errBody?.error?.message)
                    detail = errBody.error.message;
            }
            catch { /* keep status detail */ }
            logger_1.logger.warn('ai_service_error', { path, status: resp.status, detail });
            throw (0, errors_1.aiServiceError)(resp.status === 401
                ? 'AI service rejected the service key — check AI_SERVICE_KEY on both services'
                : `AI service request failed (${detail}). The chatbot can retry, or run with AI_PROVIDER=demo.`);
        }
        const data = (await resp.json());
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
            logger_1.logger.error('ai_response_invalid', {
                path,
                issues: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`),
            });
            throw (0, errors_1.aiServiceError)('AI service returned an invalid response shape. Check that the Python service version matches the backend.');
        }
        return parsed.data;
    }
    catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'AI_SERVICE_ERROR') {
            throw err;
        }
        if (err.name === 'AbortError') {
            logger_1.logger.warn('ai_service_timeout', { path });
            throw (0, errors_1.aiServiceError)('AI service timed out after 25s. Please try again.');
        }
        logger_1.logger.warn('ai_service_unreachable', { path, message: String(err.message) });
        throw (0, errors_1.aiServiceError)(`Unable to reach the Python AI service at ${env_1.env.aiServiceUrl}. Start it with: npm run dev --prefix ai-service`);
    }
    finally {
        clearTimeout(timer);
    }
}
const aiChat = (input) => call('/api/v1/ai/chat', input, exports.ChatResponseSchema);
exports.aiChat = aiChat;
const aiHealth = async () => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(`${env_1.env.aiServiceUrl}/health`, {
            headers: { 'X-Service-Key': env_1.env.aiServiceKey },
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok)
            return null;
        return (await resp.json());
    }
    catch {
        return null;
    }
};
exports.aiHealth = aiHealth;
//# sourceMappingURL=client.js.map