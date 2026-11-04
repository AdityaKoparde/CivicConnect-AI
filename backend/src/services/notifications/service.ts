/** In-app notification service (no email/SMS is claimed). */
import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

type Tx = Prisma.TransactionClient;

export async function notify(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  complaintId?: string,
  tx?: Tx,
): Promise<void> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  const client = tx ?? prisma;
  await client.notification.createMany({
    data: ids.map((userId) => ({
      userId, type, title, body, complaintId: complaintId ?? null,
    })),
  });
}

/** Staff users who should hear about a complaint for a department. */
export async function staffOfDepartment(
  departmentId: string | null,
  tx?: Tx,
): Promise<string[]> {
  const client = tx ?? prisma;
  if (!departmentId) return [];
  const users = await client.user.findMany({
    where: {
      departmentId,
      isActive: true,
      role: { in: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'DEPARTMENT_OFFICER'] },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function superAdminIds(tx?: Tx): Promise<string[]> {
  const client = tx ?? prisma;
  const users = await client.user.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}
