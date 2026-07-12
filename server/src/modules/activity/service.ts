import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { emitBroadcast } from '../../sockets';

interface LogInput {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Every mutation should call this. Writes an ActivityLog row and pushes the
 * event to the live activity feed.
 */
export async function logActivity(
  input: LogInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  const log = await client.activityLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
    include: { actor: { select: { id: true, name: true, role: true } } },
  });
  emitBroadcast('activity:new', log);
}
