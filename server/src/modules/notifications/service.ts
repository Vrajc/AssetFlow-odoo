import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { emitToUser } from '../../sockets';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** Create a notification for one user and push it live (toast + bell badge). */
export async function notify(input: NotifyInput, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const notification = await client.notification.create({ data: input });
  emitToUser(input.userId, 'notification:new', notification);
  emitToUser(input.userId, 'kpi:refresh', { reason: 'notification' });
  return notification;
}

/** Notify many users at once (e.g. all asset managers). */
export async function notifyMany(
  userIds: string[],
  input: Omit<NotifyInput, 'userId'>,
  tx?: Prisma.TransactionClient,
) {
  const unique = [...new Set(userIds)];
  await Promise.all(unique.map((userId) => notify({ ...input, userId }, tx)));
}

export async function listNotifications(userId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { items, unread };
}

export async function markRead(userId: string, id: string) {
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  return listNotifications(userId);
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  return listNotifications(userId);
}
