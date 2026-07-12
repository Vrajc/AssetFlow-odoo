import { BookingStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { intervalsOverlap } from '../../utils/overlap';
import { logActivity } from '../activity/service';
import { notify } from '../notifications/service';
import { emitBroadcast } from '../../sockets';
import { AuthUser } from '../../middleware/auth';

const bookingInclude = {
  resource: { select: { id: true, assetTag: true, name: true } },
  bookedBy: { select: { id: true, name: true } },
} satisfies Prisma.BookingInclude;

/** Derive live status from time (unless cancelled). */
export function deriveStatus(b: { startTime: Date; endTime: Date; status: BookingStatus }): BookingStatus {
  if (b.status === 'CANCELLED') return 'CANCELLED';
  const now = new Date();
  if (now < b.startTime) return 'UPCOMING';
  if (now >= b.startTime && now < b.endTime) return 'ONGOING';
  return 'COMPLETED';
}

export async function listResources() {
  return prisma.asset.findMany({
    where: { isBookable: true, status: { notIn: ['RETIRED', 'DISPOSED', 'LOST'] } },
    select: { id: true, assetTag: true, name: true, location: true, category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function resourceBookings(resourceId: string, from?: string, to?: string) {
  const where: Prisma.BookingWhereInput = { resourceId, status: { not: 'CANCELLED' } };
  if (from || to) {
    where.startTime = {};
    if (from) (where.startTime as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) (where.startTime as Prisma.DateTimeFilter).lte = new Date(to);
  }
  const bookings = await prisma.booking.findMany({ where, include: bookingInclude, orderBy: { startTime: 'asc' } });
  return bookings.map((b) => ({ ...b, status: deriveStatus(b) }));
}

async function assertNoOverlap(resourceId: string, start: Date, end: Date, ignoreId?: string) {
  if (end <= start) throw badRequest('End time must be after start time');
  const existing = await prisma.booking.findMany({
    where: { resourceId, status: { not: 'CANCELLED' }, id: ignoreId ? { not: ignoreId } : undefined },
  });
  const clash = existing.find((b) => intervalsOverlap(start, end, b.startTime, b.endTime));
  if (clash) {
    throw conflict('BOOKING_OVERLAP', 'That time slot overlaps an existing booking.', {
      conflict: { id: clash.id, startTime: clash.startTime, endTime: clash.endTime },
    });
  }
}

export async function createBooking(
  actor: AuthUser,
  input: { resourceId: string; startTime: string; endTime: string; purpose?: string; onBehalfOfDepartmentId?: string },
) {
  const resource = await prisma.asset.findUnique({ where: { id: input.resourceId } });
  if (!resource) throw notFound('Resource not found');
  if (!resource.isBookable) throw badRequest('This asset is not a bookable resource');

  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  await assertNoOverlap(input.resourceId, start, end);

  const booking = await prisma.booking.create({
    data: {
      resourceId: input.resourceId,
      bookedById: actor.id,
      startTime: start,
      endTime: end,
      purpose: input.purpose || null,
      onBehalfOfDepartmentId: input.onBehalfOfDepartmentId || null,
    },
    include: bookingInclude,
  });
  await logActivity({ actorId: actor.id, action: 'BOOKING_CREATED', entityType: 'Booking', entityId: booking.id, metadata: { resource: resource.name } });
  await notify({ userId: actor.id, type: 'BOOKING_UPDATE', title: 'Booking confirmed', body: `${resource.name} booked.`, link: '/bookings' });
  emitBroadcast('booking:updated', { resourceId: input.resourceId });
  emitBroadcast('kpi:refresh', { reason: 'booking' });
  return { ...booking, status: deriveStatus(booking) };
}

export async function cancelBooking(actor: AuthUser, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw notFound('Booking not found');
  if (booking.bookedById !== actor.id && actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
    throw forbidden('You can only cancel your own bookings');
  }
  const updated = await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' }, include: bookingInclude });
  await logActivity({ actorId: actor.id, action: 'BOOKING_CANCELLED', entityType: 'Booking', entityId: id });
  await notify({ userId: booking.bookedById, type: 'BOOKING_UPDATE', title: 'Booking cancelled', body: `${booking.resource.name} booking was cancelled.`, link: '/bookings' });
  emitBroadcast('booking:updated', { resourceId: booking.resourceId });
  return updated;
}

export async function rescheduleBooking(actor: AuthUser, id: string, input: { startTime: string; endTime: string }) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw notFound('Booking not found');
  if (booking.bookedById !== actor.id && actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
    throw forbidden('You can only reschedule your own bookings');
  }
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);
  await assertNoOverlap(booking.resourceId, start, end, id);
  const updated = await prisma.booking.update({
    where: { id },
    data: { startTime: start, endTime: end, status: 'UPCOMING', reminderSent: false },
    include: bookingInclude,
  });
  await logActivity({ actorId: actor.id, action: 'BOOKING_RESCHEDULED', entityType: 'Booking', entityId: id });
  emitBroadcast('booking:updated', { resourceId: booking.resourceId });
  return { ...updated, status: deriveStatus(updated) };
}

export async function myBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: { bookedById: userId },
    include: bookingInclude,
    orderBy: { startTime: 'desc' },
    take: 50,
  });
  return bookings.map((b) => ({ ...b, status: deriveStatus(b) }));
}
