/** Secure file uploads (images only, size-limited) + authorized download. */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { badRequest, forbidden, notFound } from '../utils/errors';
import { requireAuth } from '../middleware/auth';
import { verifyGuest } from '../utils/crypto';
import { GUEST_COOKIE } from '../config/constants';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Only PNG, JPEG, WebP or GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export const upload = [
  (req: Request, res: Response, next: NextFunction) => {
    // Auth: logged-in user OR a valid guest cookie (guests attach to chat)
    if (req.user) return next();
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    if (cookies?.[GUEST_COOKIE] && verifyGuest(cookies[GUEST_COOKIE])) return next();
    next(forbidden('Sign in to upload attachments'));
  },
  (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: unknown) => {
      if (!err) return next();
      const msg = err instanceof Error ? err.message : 'Upload failed';
      if (msg.includes('File too large') || (err as { code?: string })?.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest(`File is too large (max ${env.uploadMaxBytes / (1024 * 1024)} MB)`));
      }
      next(badRequest(msg));
    });
  },
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('No file provided (field name must be "file")');
    const conversationId =
      typeof req.body?.conversationId === 'string' ? req.body.conversationId : null;

    if (conversationId) {
      // Bind the upload to the caller's conversation immediately (guests too)
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { citizen: { select: { id: true, userId: true } } },
      });
      const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
      const guestId = cookies?.[GUEST_COOKIE] ? verifyGuest(cookies[GUEST_COOKIE]) : null;
      const owned =
        conv &&
        ((req.user && conv.citizen.userId === req.user.id) ||
          (guestId && conv.citizen.id === guestId));
      if (!owned) throw notFound('Conversation not found');
    }

    const attachment = await prisma.attachment.create({
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

export const download = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw forbidden('Sign in to view attachments');
  const attachment = await prisma.attachment.findUnique({
    where: { id: req.params.id },
    include: {
      conversation: { include: { citizen: { select: { userId: true } } } },
      complaint: { include: { citizen: { select: { userId: true } } } },
      uploadedBy: { select: { id: true, role: true } },
    },
  });
  if (!attachment) throw notFound('Attachment not found');

  const user = req.user;
  const isStaff = ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'].includes(user.role);
  const isOwner =
    attachment.uploadedBy?.id === user.id ||
    attachment.conversation?.citizen.userId === user.id ||
    attachment.complaint?.citizen.userId === user.id;
  if (!isOwner && !isStaff) throw forbidden('Not your attachment');

  if (!fs.existsSync(attachment.storagePath)) throw notFound('File missing on disk');
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(attachment.filename)}"`,
  );
  fs.createReadStream(attachment.storagePath).pipe(res);
});
