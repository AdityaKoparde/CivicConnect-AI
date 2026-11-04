/** Notifications controller — in-app only. */
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { notificationsReadSchema } from '../validators/schemas';

export const list = [
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const where = {
      userId: req.user!.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
    ]);
    res.json({
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        complaintId: n.complaintId,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  }),
];

export const markRead = [
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const input = notificationsReadSchema.parse(req.body);
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        readAt: null,
        ...(input.ids === 'all' ? {} : { id: { in: input.ids } }),
      },
      data: { readAt: new Date() },
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    res.json({ unreadCount });
  }),
];
