"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = exports.upload = exports.uploadMiddleware = void 0;
/** Secure file uploads (images only, size-limited) + authorized download. */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../config/env");
const prisma_1 = require("../config/prisma");
const asyncHandler_1 = require("../utils/asyncHandler");
const errors_1 = require("../utils/errors");
const crypto_2 = require("../utils/crypto");
const constants_1 = require("../config/constants");
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const uploadRoot = path_1.default.resolve(process.cwd(), env_1.env.uploadDir);
fs_1.default.mkdirSync(uploadRoot, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase().slice(0, 10);
        cb(null, `${crypto_1.default.randomUUID()}${ext}`);
    },
});
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: { fileSize: env_1.env.uploadMaxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            cb(new Error('Only PNG, JPEG, WebP or GIF images are allowed'));
            return;
        }
        cb(null, true);
    },
}).single('file');
exports.upload = [
    (req, res, next) => {
        // Auth: logged-in user OR a valid guest cookie (guests attach to chat)
        if (req.user)
            return next();
        const cookies = req.cookies;
        if (cookies?.[constants_1.GUEST_COOKIE] && (0, crypto_2.verifyGuest)(cookies[constants_1.GUEST_COOKIE]))
            return next();
        next((0, errors_1.forbidden)('Sign in to upload attachments'));
    },
    (req, res, next) => {
        (0, exports.uploadMiddleware)(req, res, (err) => {
            if (!err)
                return next();
            const msg = err instanceof Error ? err.message : 'Upload failed';
            if (msg.includes('File too large') || err?.code === 'LIMIT_FILE_SIZE') {
                return next((0, errors_1.badRequest)(`File is too large (max ${env_1.env.uploadMaxBytes / (1024 * 1024)} MB)`));
            }
            next((0, errors_1.badRequest)(msg));
        });
    },
    (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        if (!req.file)
            throw (0, errors_1.badRequest)('No file provided (field name must be "file")');
        const conversationId = typeof req.body?.conversationId === 'string' ? req.body.conversationId : null;
        if (conversationId) {
            // Bind the upload to the caller's conversation immediately (guests too)
            const conv = await prisma_1.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { citizen: { select: { id: true, userId: true } } },
            });
            const cookies = req.cookies;
            const guestId = cookies?.[constants_1.GUEST_COOKIE] ? (0, crypto_2.verifyGuest)(cookies[constants_1.GUEST_COOKIE]) : null;
            const owned = conv &&
                ((req.user && conv.citizen.userId === req.user.id) ||
                    (guestId && conv.citizen.id === guestId));
            if (!owned)
                throw (0, errors_1.notFound)('Conversation not found');
        }
        const attachment = await prisma_1.prisma.attachment.create({
            data: {
                filename: req.file.originalname.slice(0, 255),
                mimeType: req.file.mimetype,
                size: req.file.size,
                storagePath: req.file.path,
                conversationId: conversationId && conversationId !== 'null' ? conversationId : null,
                uploadedById: req.user?.id ?? null,
            },
        });
        res.status(201).json({
            id: attachment.id,
            url: `/api/files/${attachment.id}`,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
        });
    }),
];
exports.download = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user)
        throw (0, errors_1.forbidden)('Sign in to view attachments');
    const attachment = await prisma_1.prisma.attachment.findUnique({
        where: { id: req.params.id },
        include: {
            conversation: { include: { citizen: { select: { userId: true } } } },
            complaint: { include: { citizen: { select: { userId: true } } } },
            uploadedBy: { select: { id: true, role: true } },
        },
    });
    if (!attachment)
        throw (0, errors_1.notFound)('Attachment not found');
    const user = req.user;
    const isStaff = ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'].includes(user.role);
    const isOwner = attachment.uploadedBy?.id === user.id ||
        attachment.conversation?.citizen.userId === user.id ||
        attachment.complaint?.citizen.userId === user.id;
    if (!isOwner && !isStaff)
        throw (0, errors_1.forbidden)('Not your attachment');
    if (!fs_1.default.existsSync(attachment.storagePath))
        throw (0, errors_1.notFound)('File missing on disk');
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.filename)}"`);
    fs_1.default.createReadStream(attachment.storagePath).pipe(res);
});
//# sourceMappingURL=upload.controller.js.map