"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversation = createConversation;
exports.getConversation = getConversation;
exports.postMessage = postMessage;
exports.confirmComplaint = confirmComplaint;
exports.cancelConversation = cancelConversation;
const prisma_1 = require("../../config/prisma");
const client_1 = require("../ai/client");
const errors_1 = require("../../utils/errors");
const complaintId_1 = require("../../utils/complaintId");
const crypto_1 = require("../../utils/crypto");
const service_1 = require("../audit/service");
const service_2 = require("../notifications/service");
const engine_1 = require("../routing/engine");
const DEFAULT_STATE = {
    slots: {},
    missing: [],
    understanding: null,
    turn: 0,
    emergencyHandled: false,
    awaitingConfirmation: false,
    askedCategories: false,
    askedRoadType: false,
    askedLocationTimes: 0,
};
const isOwner = (citizenUserId, caller, citizenId) => {
    if (caller.user)
        return citizenUserId === caller.user.id;
    return Boolean(caller.guestCitizenId && caller.guestCitizenId === citizenId);
};
async function loadOwnedConversation(caller, id) {
    const conv = await prisma_1.prisma.conversation.findUnique({
        where: { id },
        include: {
            citizen: { select: { id: true, userId: true, name: true } },
            messages: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!conv || !isOwner(conv.citizen.userId, caller, conv.citizen.id)) {
        throw (0, errors_1.notFound)('Conversation not found');
    }
    return conv;
}
async function createConversation(caller, language) {
    let citizenId;
    if (caller.user) {
        const existing = await prisma_1.prisma.citizen.findUnique({
            where: { userId: caller.user.id },
            select: { id: true },
        });
        citizenId =
            existing?.id ??
                (await prisma_1.prisma.citizen.create({
                    data: {
                        userId: caller.user.id,
                        name: caller.user.name,
                        preferredLanguage: language ?? 'en',
                    },
                    select: { id: true },
                })).id;
    }
    else if (caller.guestCitizenId) {
        // Returning guest — reuse the citizen bound to their cookie so every
        // conversation they open stays owned by the same identity.
        citizenId = caller.guestCitizenId;
    }
    else {
        // anonymous citizen — complaints stay trackable via the tracking token
        citizenId = (await prisma_1.prisma.citizen.create({
            data: { name: 'Guest citizen', preferredLanguage: language ?? 'en' },
            select: { id: true },
        })).id;
    }
    const conv = await prisma_1.prisma.conversation.create({
        data: {
            citizenId,
            language: language ?? 'en',
            state: DEFAULT_STATE,
        },
    });
    return {
        conversation: {
            id: conv.id,
            language: conv.language,
            status: conv.status,
            state: DEFAULT_STATE,
            createdAt: conv.createdAt,
        },
        setGuestCitizenId: caller.user ? undefined : citizenId,
    };
}
async function getConversation(caller, id) {
    const conv = await loadOwnedConversation(caller, id);
    return {
        conversation: {
            id: conv.id,
            language: conv.language,
            status: conv.status,
            state: conv.state,
            complaintId: conv.complaintId,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
        },
        messages: conv.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            language: m.language,
            createdAt: m.createdAt,
            meta: m.meta,
        })),
    };
}
async function postMessage(caller, id, input) {
    const conv = await loadOwnedConversation(caller, id);
    if (conv.status !== 'ACTIVE') {
        throw (0, errors_1.conflict)('This conversation is no longer active');
    }
    const state = normalizeState(conv.state);
    // Merge client-provided context into the slot state (Python reads it back).
    if (input.location) {
        state.slots.location = {
            latitude: input.location.latitude,
            longitude: input.location.longitude,
            label: input.location.label ?? null,
        };
    }
    if (input.attachments?.length) {
        const ids = input.attachments.map((a) => a.id);
        const owned = await prisma_1.prisma.attachment.findMany({
            where: {
                id: { in: ids },
                OR: [{ conversationId: conv.id }, { conversationId: null }],
            },
            select: { id: true, filename: true },
        });
        const current = Array.isArray(state.slots.attachments)
            ? state.slots.attachments
            : [];
        const seen = new Set(current.map((a) => a.id));
        for (const a of owned) {
            if (!seen.has(a.id)) {
                current.push({
                    id: a.id,
                    filename: a.filename,
                    url: `/api/files/${a.id}`,
                });
                seen.add(a.id);
            }
        }
        state.slots.attachments = current;
        await prisma_1.prisma.attachment.updateMany({
            where: { id: { in: owned.map((a) => a.id) } },
            data: { conversationId: conv.id },
        });
    }
    const history = conv.messages
        .slice(-10)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));
    const preferredLanguage = input.language ?? conv.language;
    const aiResponse = await (0, client_1.aiChat)({
        message: input.content,
        language: preferredLanguage,
        history,
        state,
    });
    const now = new Date();
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.message.create({
            data: {
                conversationId: conv.id,
                role: 'user',
                content: input.content,
                language: preferredLanguage,
                createdAt: now,
            },
        }),
        prisma_1.prisma.message.create({
            data: {
                conversationId: conv.id,
                role: 'assistant',
                content: aiResponse.reply,
                language: aiResponse.detected_language,
                meta: {
                    nextAction: aiResponse.next_action,
                    emergency: aiResponse.emergency.is_emergency,
                    needsConfirmation: aiResponse.needs_confirmation,
                },
                createdAt: new Date(now.getTime() + 1),
            },
        }),
        prisma_1.prisma.conversation.update({
            where: { id: conv.id },
            data: {
                state: aiResponse.state,
                language: preferredLanguage,
                updatedAt: new Date(now.getTime() + 1),
            },
        }),
    ]);
    return {
        userMessage: {
            id: 'pending',
            role: 'user',
            content: input.content,
            createdAt: now,
        },
        assistantMessage: {
            id: 'pending',
            role: 'assistant',
            content: aiResponse.reply,
            language: aiResponse.detected_language,
            createdAt: new Date(now.getTime() + 1),
        },
        understanding: aiResponse.understanding,
        nextAction: aiResponse.next_action,
        needsConfirmation: aiResponse.needs_confirmation,
        confirmationSummary: aiResponse.confirmation_summary ?? null,
        emergency: {
            isEmergency: aiResponse.emergency.is_emergency,
            guidance: aiResponse.emergency.guidance ?? null,
            callNumber: aiResponse.emergency.call_number,
        },
        missingSlots: aiResponse.missing_slots,
        suggestedReplies: aiResponse.suggested_replies,
        state: aiResponse.state,
        aiProvider: aiResponse.ai_provider,
    };
}
async function confirmComplaint(caller, id, ip) {
    const conv = await loadOwnedConversation(caller, id);
    if (conv.status === 'CONFIRMED')
        throw (0, errors_1.conflict)('This complaint was already registered');
    if (conv.status === 'ABANDONED')
        throw (0, errors_1.conflict)('This conversation was cancelled');
    const state = normalizeState(conv.state);
    const understanding = state.understanding;
    if (!state.awaitingConfirmation || !understanding) {
        throw (0, errors_1.badRequest)('The complaint is not ready for confirmation yet — continue the conversation first');
    }
    const routing = await (0, engine_1.routeComplaint)(understanding, state.slots);
    const trackingToken = (0, crypto_1.newTrackingToken)();
    const complaintId = await (0, complaintId_1.generateComplaintId)();
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        const complaint = await tx.complaint.create({
            data: {
                complaintId,
                citizenId: conv.citizenId,
                originalText: routing.originalText,
                normalizedText: routing.normalizedText,
                summary: routing.summary,
                language: routing.language,
                category: routing.category,
                priority: routing.priority,
                safetyRisk: routing.safetyRisk,
                emergency: routing.emergency,
                status: routing.status,
                district: routing.district,
                taluk: routing.taluk,
                city: routing.city,
                ward: routing.ward,
                landmark: routing.landmark,
                latitude: routing.latitude,
                longitude: routing.longitude,
                jurisdictionId: routing.jurisdictionId,
                departmentId: routing.departmentId,
                assignedOfficerId: routing.officerId,
                aiConfidence: routing.aiConfidence,
                aiReasoning: routing.aiReasoning,
                aiProvider: routing.aiProvider,
                requiresManualReview: routing.requiresManualReview,
                routingExplanation: routing.explanation,
                trackingHash: (0, crypto_1.hashTrackingToken)(trackingToken),
                isDemo: false,
            },
        });
        await tx.attachment.updateMany({
            where: { conversationId: conv.id, complaintId: null },
            data: { complaintId: complaint.id },
        });
        await tx.conversation.update({
            where: { id: conv.id },
            data: {
                status: 'CONFIRMED',
                complaintId: complaint.id,
                state: { ...state, awaitingConfirmation: false },
            },
        });
        await tx.complaintUpdate.create({
            data: {
                complaintId: complaint.id,
                kind: 'STATUS',
                toStatus: 'SUBMITTED',
                isPublic: true,
                note: 'Complaint registered through CivicConnect AI.',
            },
        });
        if (routing.departmentId) {
            await tx.assignment.create({
                data: {
                    complaintId: complaint.id,
                    departmentId: routing.departmentId,
                    officerId: routing.officerId,
                    reason: routing.explanation.slice(0, 500),
                },
            });
            await tx.complaintUpdate.create({
                data: {
                    complaintId: complaint.id,
                    kind: 'ASSIGNMENT',
                    toStatus: routing.status === 'ASSIGNED' ? 'ASSIGNED' : 'SUBMITTED',
                    isPublic: true,
                    note: `Routed to ${routing.departmentName} based on complaint category and location.`,
                },
            });
        }
        // ---- notifications (in-app only; nothing is emailed or sent externally) ----
        const staff = await (0, service_2.staffOfDepartment)(routing.departmentId, tx);
        const recipients = new Set(staff);
        if (routing.officerId)
            recipients.add(routing.officerId);
        if (routing.requiresManualReview || !routing.departmentId) {
            (await (0, service_2.superAdminIds)(tx)).forEach((a) => recipients.add(a));
        }
        if (routing.emergency) {
            (await (0, service_2.superAdminIds)(tx)).forEach((a) => recipients.add(a));
        }
        await (0, service_2.notify)([...recipients], 'COMPLAINT_SUBMITTED', routing.emergency
            ? `⚠ Emergency complaint ${complaintId}`
            : `New complaint ${complaintId}`, routing.emergency
            ? `Emergency-flagged: ${routing.summary}`
            : `Category ${routing.category}, priority ${routing.priority}. ${routing.departmentName ?? 'Needs routing'}.`, complaint.id, tx);
        if (routing.officerId) {
            await (0, service_2.notify)([routing.officerId], 'ASSIGNED', `${complaintId} assigned to you`, routing.summary, complaint.id, tx);
        }
        return complaint;
    });
    await (0, service_1.audit)({
        actorId: caller.user?.id ?? null,
        action: 'COMPLAINT_CREATED',
        entityType: 'Complaint',
        entityId: created.id,
        metadata: {
            complaintId,
            category: routing.category,
            departmentId: routing.departmentId,
            requiresManualReview: routing.requiresManualReview,
            emergency: routing.emergency,
            via: 'chatbot',
        },
        ip,
    });
    return {
        complaint: {
            id: created.id,
            complaintId: created.complaintId,
            status: created.status,
            category: created.category,
            priority: created.priority,
            departmentName: routing.departmentName,
            departmentCode: null,
            routingExplanation: routing.explanation,
            requiresManualReview: routing.requiresManualReview,
            emergency: routing.emergency,
            createdAt: created.createdAt,
        },
        trackingToken, // shown exactly once — the citizen must save it
        conversationId: conv.id,
    };
}
async function cancelConversation(caller, id) {
    const conv = await loadOwnedConversation(caller, id);
    if (conv.status === 'CONFIRMED')
        throw (0, errors_1.conflict)('Already registered — cannot cancel');
    const updated = await prisma_1.prisma.conversation.update({
        where: { id: conv.id },
        data: { status: 'ABANDONED' },
    });
    return { conversation: { id: updated.id, status: updated.status } };
}
/** Defensive normalisation of persisted state (older rows, hand-edits). */
function normalizeState(raw) {
    const s = (raw ?? {});
    return {
        slots: (s.slots ?? {}),
        missing: Array.isArray(s.missing) ? s.missing : [],
        understanding: s.understanding ?? null,
        turn: typeof s.turn === 'number' ? s.turn : 0,
        emergencyHandled: Boolean(s.emergencyHandled),
        awaitingConfirmation: Boolean(s.awaitingConfirmation),
        askedCategories: Boolean(s.askedCategories),
        askedRoadType: Boolean(s.askedRoadType),
        askedLocationTimes: typeof s.askedLocationTimes === 'number' ? s.askedLocationTimes : 0,
    };
}
//# sourceMappingURL=service.js.map