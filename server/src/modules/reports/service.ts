import { subDays, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '../../lib/prisma';

export async function kpis() {
  const now = new Date();
  const [available, allocated, maintenanceToday, activeBookings, pendingTransfers, upcomingReturns, overdue] = await Promise.all([
    prisma.asset.count({ where: { status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { status: 'ALLOCATED' } }),
    prisma.maintenanceRequest.count({ where: { createdAt: { gte: startOfDay(now), lte: endOfDay(now) } } }),
    prisma.booking.count({ where: { status: { not: 'CANCELLED' }, startTime: { lte: now }, endTime: { gte: now } } }),
    prisma.transferRequest.count({ where: { status: 'REQUESTED' } }),
    prisma.allocation.count({ where: { status: 'ACTIVE', returnedAt: null, expectedReturnDate: { gte: now, lte: subDays(now, -7) } } }),
    prisma.allocation.count({ where: { status: { in: ['ACTIVE', 'OVERDUE'] }, returnedAt: null, expectedReturnDate: { lt: now } } }),
  ]);
  return {
    available,
    allocated,
    maintenanceToday,
    activeBookings,
    pendingTransfers,
    upcomingReturns,
    overdueReturns: overdue,
    underMaintenance: await prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
    totalAssets: await prisma.asset.count(),
  };
}

export async function overdueList() {
  return prisma.allocation.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] }, returnedAt: null, expectedReturnDate: { lt: new Date() } },
    include: { asset: { select: { assetTag: true, name: true } }, allocatedTo: { select: { name: true, department: { select: { name: true } } } } },
    orderBy: { expectedReturnDate: 'asc' },
  });
}

export async function utilization(groupBy: 'department' | 'category') {
  const assets = await prisma.asset.findMany({ include: { department: true, category: true } });
  const buckets: Record<string, { name: string; total: number; allocated: number; available: number; maintenance: number }> = {};
  for (const a of assets) {
    const key = groupBy === 'department' ? a.department?.name ?? 'Unassigned' : a.category.name;
    buckets[key] ??= { name: key, total: 0, allocated: 0, available: 0, maintenance: 0 };
    buckets[key].total += 1;
    if (a.status === 'ALLOCATED') buckets[key].allocated += 1;
    if (a.status === 'AVAILABLE') buckets[key].available += 1;
    if (a.status === 'UNDER_MAINTENANCE') buckets[key].maintenance += 1;
  }
  return Object.values(buckets).map((b) => ({ ...b, utilizationPct: b.total ? Math.round((b.allocated / b.total) * 100) : 0 }));
}

export async function maintenanceFrequency() {
  const reqs = await prisma.maintenanceRequest.findMany({ include: { asset: { include: { category: true } } } });
  const byCategory: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  for (const r of reqs) {
    byCategory[r.asset.category.name] = (byCategory[r.asset.category.name] ?? 0) + 1;
    const m = r.createdAt.toISOString().slice(0, 7);
    byMonth[m] = (byMonth[m] ?? 0) + 1;
  }
  return {
    byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })),
    trend: Object.entries(byMonth).sort().map(([month, count]) => ({ month, count })),
  };
}

export async function mostUsedIdle() {
  const assets = await prisma.asset.findMany({
    include: {
      _count: { select: { bookings: true, allocations: true } },
      bookings: { orderBy: { startTime: 'desc' }, take: 1 },
      allocations: { orderBy: { allocatedAt: 'desc' }, take: 1 },
    },
  });
  const cutoff = subDays(new Date(), 45);
  const scored = assets.map((a) => {
    const lastBooking = a.bookings[0]?.startTime;
    const lastAlloc = a.allocations[0]?.allocatedAt;
    const lastActivity = [lastBooking, lastAlloc].filter(Boolean).sort().pop() as Date | undefined;
    return {
      id: a.id,
      assetTag: a.assetTag,
      name: a.name,
      uses: a._count.bookings + a._count.allocations,
      lastActivity: lastActivity ?? null,
      idle: !lastActivity || lastActivity < cutoff,
    };
  });
  return {
    mostUsed: [...scored].sort((x, y) => y.uses - x.uses).slice(0, 8),
    idle: scored.filter((s) => s.idle).slice(0, 8),
  };
}

export async function dueSoon() {
  const fourYearsAgo = subDays(new Date(), 365 * 4);
  const nearingRetirement = await prisma.asset.findMany({
    where: { OR: [{ acquisitionDate: { lt: fourYearsAgo } }, { condition: 'POOR' }], status: { notIn: ['RETIRED', 'DISPOSED'] } },
    select: { id: true, assetTag: true, name: true, condition: true, acquisitionDate: true },
    take: 20,
  });
  const dueMaintenance = await prisma.asset.findMany({
    where: { condition: { in: ['POOR', 'FAIR'] }, status: { notIn: ['UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED'] } },
    select: { id: true, assetTag: true, name: true, condition: true },
    take: 20,
  });
  return { nearingRetirement, dueMaintenance };
}

export async function bookingHeatmap() {
  const bookings = await prisma.booking.findMany({ where: { status: { not: 'CANCELLED' } }, select: { startTime: true } });
  // 7 days x 24 hours grid.
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const b of bookings) {
    const d = b.startTime.getDay();
    const h = b.startTime.getHours();
    grid[d][h] += 1;
  }
  return { grid };
}

export async function deptAllocationSummary() {
  const depts = await prisma.department.findMany({
    include: { _count: { select: { assets: true, members: true } } },
    orderBy: { name: 'asc' },
  });
  return depts.map((d) => ({ name: d.name, assets: d._count.assets, members: d._count.members }));
}
