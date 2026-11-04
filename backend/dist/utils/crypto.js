"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeEqual = exports.hashTrackingToken = exports.newTrackingToken = exports.verifyGuest = exports.signGuest = exports.verifySession = exports.signSession = void 0;
/** JWT session + tracking-token hashing helpers. */
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const signSession = (payload) => jsonwebtoken_1.default.sign(payload, env_1.env.jwtSecret, {
    expiresIn: env_1.env.jwtExpiresInSeconds,
    issuer: 'civicconnect-ai',
});
exports.signSession = signSession;
const verifySession = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret, { issuer: 'civicconnect-ai' });
        if (typeof decoded === 'string')
            return null;
        const { sub, role, name } = decoded;
        if (!sub || !role)
            return null;
        return { sub, role, name: name ?? '' };
    }
    catch {
        return null;
    }
};
exports.verifySession = verifySession;
/** Guest chat sessions (no account) get a signed cookie binding them to a
 *  Citizen row so conversations survive reloads without exposing others' data. */
const signGuest = (citizenId) => jsonwebtoken_1.default.sign({ sub: `guest:${citizenId}`, role: 'GUEST', name: 'Guest' }, env_1.env.jwtSecret, {
    expiresIn: env_1.env.jwtExpiresInSeconds,
    issuer: 'civicconnect-ai',
});
exports.signGuest = signGuest;
const verifyGuest = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret, { issuer: 'civicconnect-ai' });
        if (typeof decoded === 'string')
            return null;
        const sub = decoded.sub ?? '';
        return sub.startsWith('guest:') ? sub.slice(6) : null;
    }
    catch {
        return null;
    }
};
exports.verifyGuest = verifyGuest;
/** Raw tracking token is shown to the citizen exactly once. */
const newTrackingToken = () => crypto_1.default.randomBytes(24).toString('base64url');
exports.newTrackingToken = newTrackingToken;
const hashTrackingToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
exports.hashTrackingToken = hashTrackingToken;
const safeEqual = (a, b) => {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length)
        return false;
    return crypto_1.default.timingSafeEqual(ba, bb);
};
exports.safeEqual = safeEqual;
//# sourceMappingURL=crypto.js.map