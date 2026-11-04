"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancel = exports.confirm = exports.message = exports.detail = exports.create = exports.getCaller = void 0;
const constants_1 = require("../config/constants");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const crypto_1 = require("../utils/crypto");
const service_1 = require("../services/chat/service");
const schemas_1 = require("../validators/schemas");
/** Resolve who is calling: logged-in user or guest-cookie holder. */
const getCaller = (req) => {
    if (req.user)
        return { user: req.user };
    const cookies = req.cookies;
    const guestId = cookies?.[constants_1.GUEST_COOKIE] ? (0, crypto_1.verifyGuest)(cookies[constants_1.GUEST_COOKIE]) : null;
    return guestId ? { guestCitizenId: guestId } : {};
};
exports.getCaller = getCaller;
const requireCaller = (req) => {
    const caller = (0, exports.getCaller)(req);
    if (!caller.user && !caller.guestCitizenId) {
        throw (0, errors_1.unauthenticated)('Sign in or start a conversation first');
    }
    return caller;
};
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const input = schemas_1.createConversationSchema.parse(req.body ?? {});
    const caller = (0, exports.getCaller)(req);
    if (!caller.user && !caller.guestCitizenId) {
        // Brand-new guest: create an anonymous citizen + signed guest cookie
        const result = await (0, service_1.createConversation)({}, input.language ?? null);
        if (result.setGuestCitizenId) {
            res.cookie(constants_1.GUEST_COOKIE, (0, crypto_1.signGuest)(result.setGuestCitizenId), {
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
    const result = await (0, service_1.createConversation)(caller, input.language ?? null);
    res.status(201).json({ conversation: result.conversation });
});
exports.detail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const caller = requireCaller(req);
    const data = await (0, service_1.getConversation)(caller, req.params.id);
    res.json(data);
});
exports.message = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const caller = requireCaller(req);
    const input = schemas_1.postMessageSchema.parse(req.body);
    const data = await (0, service_1.postMessage)(caller, req.params.id, input);
    res.json(data);
});
exports.confirm = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const caller = requireCaller(req);
    schemas_1.confirmSchema.parse(req.body);
    const data = await (0, service_1.confirmComplaint)(caller, req.params.id, req.ip);
    res.status(201).json(data);
});
exports.cancel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const caller = requireCaller(req);
    const data = await (0, service_1.cancelConversation)(caller, req.params.id);
    res.json(data);
});
//# sourceMappingURL=chat.controller.js.map