import cron from 'node-cron';
import { addMinutes } from 'date-fns';
import { prisma } from '../lib/prisma';
import { notify, notifyMany } from '../modules/notifications/service';
import { emitBroadcast } from '../sockets';

async function sweepOverdue() {
  const now = new Date();
  const overdue = await prisma.allocation.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] }, returnedAt: null, expectedReturnDate: { lt: now } },
    include: { asset: { select: { assetTag: true, name: true } } },
  });

  const managers = (await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } }, select: { id: true } })).map((u) => u.id);

  for (const a of overdue) {
    if (a.status !== 'OVERDUE') {
      await prisma.allocation.update({ where: { id: a.id }, data: { status: 'OVERDUE' } });
    }
    // Notify at most once per day per allocation.
    const notifiedToday = a.overdueNotifiedAt && a.overdueNotifiedAt > addMinutes(now, -60 * 24);
    if (!notifiedToday) {
      await prisma.allocation.update({ where: { id: a.id }, data: { overdueNotifiedAt: now } });
      await notify({ userId: a.allocatedToId, type: 'OVERDUE_RETURN', title: 'Overdue return', body: `${a.asset.assetTag} — ${a.asset.name} is past its expected return date.`, link: '/allocations' });
      await notifyMany(managers, { type: 'OVERDUE_RETURN', title: 'Overdue return flagged', body: `${a.asset.assetTag} is overdue.`, link: '/allocations?overdue=true' });
    }
  }
  if (overdue.length) emitBroadcast('kpi:refresh', { reason: 'overdue_sweep' });
}

async function bookingReminders() {
  const now = new Date();
  const soon = addMinutes(now, 30);
  const upcoming = await prisma.booking.findMany({
    where: { status: { not: 'CANCELLED' }, reminderSent: false, startTime: { gte: now, lte: soon } },
    include: { resource: { select: { name: true } } },
  });
  for (const b of upcoming) {
    await prisma.booking.update({ where: { id: b.id }, data: { reminderSent: true } });
    await notify({ userId: b.bookedById, type: 'BOOKING_REMINDER', title: 'Booking starts soon', body: `${b.resource.name} starts within 30 minutes.`, link: '/bookings' });
  }
}

export function startCron() {
  // Every 15 minutes.
  cron.schedule('*/15 * * * *', () => {
    sweepOverdue().catch((e) => console.error('[cron overdue]', e));
    bookingReminders().catch((e) => console.error('[cron reminders]', e));
  });
  // Run once shortly after boot so the demo has fresh state.
  setTimeout(() => {
    sweepOverdue().catch(() => {});
    bookingReminders().catch(() => {});
  }, 4000);
  // eslint-disable-next-line no-console
  console.log('[cron] scheduled overdue sweep + booking reminders (every 15m)');
}
