/** Audit log writer — records who did what, without storing citizen text. */
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

type Tx = Prisma.TransactionClient;

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  tx?: Tx;
}): Promise<void> {
  const client = input.tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: input.ip ?? null,
    },
  });
}
