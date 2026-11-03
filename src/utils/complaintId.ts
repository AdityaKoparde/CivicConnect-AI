/** Unique complaint ID generation: CCAI-YYYY-NNNNNN (atomic per-year counter). */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export const generateComplaintId = async (
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string> => {
  const year = new Date().getFullYear();
  const key = `complaint-${year}`;
  const rows = await client.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value")
    VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"
  `;
  const seq = rows[0]?.value ?? 1;
  return `CCAI-${year}-${String(seq).padStart(6, '0')}`;
};
