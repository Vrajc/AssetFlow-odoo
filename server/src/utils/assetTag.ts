import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const COUNTER_ID = 'asset_tag';

/**
 * Race-safe asset tag generator. Uses an atomic upsert-increment on the Counter
 * row inside a transaction. Format: AF-0001, AF-0002 ...
 */
export async function generateAssetTag(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const counter = await client.counter.upsert({
    where: { id: COUNTER_ID },
    create: { id: COUNTER_ID, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `AF-${String(counter.value).padStart(4, '0')}`;
}
