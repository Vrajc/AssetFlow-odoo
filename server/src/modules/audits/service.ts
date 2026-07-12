import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, forbidden, notFound } from '../../utils/errors';
import { changeStatus } from '../assets/service';
import { logActivity } from '../activity/service';
import { notify, notifyMany } from '../notifications/service';
import { emitBroadcast } from '../../sockets';
import { AuthUser } from '../../middleware/auth';

const cycleInclude = {
  createdBy: { select: { id: true, name: true } },
  auditors: { include: { auditor: { select: { id: true, name: true } } } },
  _count: { select: { items: true } },
} satisfies Prisma.AuditCycleInclude;

export async function listCycles() {
  const cycles = await prisma.auditCycle.findMany({ include: cycleInclude, orderBy: { createdAt: 'desc' } });
  const withProgress = await Promise.all(
    cycles.map(async (c) => {
      const [total, done] = await Promise.all([
        prisma.auditItem.count({ where: { cycleId: c.id } }),
        prisma.auditItem.count({ where: { cycleId: c.id, verification: { not: 'PENDING' } } }),
      ]);
      return { ...c, progress: total ? Math.round((done / total) * 100) : 0, total, done };
    }),
  );
  return withProgress;
}

export async function createCycle(
  actorId: string,
  input: { name: string; scopeDepartmentId?: string; scopeLocation?: string; startDate: string; endDate: string; auditorIds: string[] },
) {
  // Resolve in-scope assets.
  const where: Prisma.AssetWhereInput = { status: { notIn: ['DISPOSED', 'RETIRED'] } };
  if (input.scopeDepartmentId) where.departmentId = input.scopeDepartmentId;
  if (input.scopeLocation) where.location = { contains: input.scopeLocation, mode: 'insensitive' };
  const assets = await prisma.asset.findMany({ where });
  if (assets.length === 0) throw badRequest('No assets match the selected scope');

  const cycle = await prisma.$transaction(async (tx) => {
    const created = await tx.auditCycle.create({
      data: {
        name: input.name,
        scopeDepartmentId: input.scopeDepartmentId || null,
        scopeLocation: input.scopeLocation || null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        createdById: actorId,
        auditors: { create: input.auditorIds.map((auditorId) => ({ auditorId })) },
        items: { create: assets.map((a) => ({ assetId: a.id, expectedLocation: a.location })) },
      },
      include: cycleInclude,
    });
    return created;
  });

  await logActivity({ actorId, action: 'AUDIT_CYCLE_CREATED', entityType: 'AuditCycle', entityId: cycle.id, metadata: { name: cycle.name, assets: assets.length } });
  await notifyMany(input.auditorIds, { type: 'SYSTEM', title: 'You were assigned an audit', body: `Audit cycle "${cycle.name}" — ${assets.length} assets to verify.`, link: `/audits/${cycle.id}` });
  return cycle;
}

export async function getCycle(id: string) {
  const cycle = await prisma.auditCycle.findUnique({
    where: { id },
    include: {
      ...cycleInclude,
      items: {
        include: { asset: { select: { id: true, assetTag: true, name: true, location: true, status: true } }, verifiedBy: { select: { name: true } } },
        orderBy: { asset: { assetTag: 'asc' } },
      },
    },
  });
  if (!cycle) throw notFound('Audit cycle not found');
  const done = cycle.items.filter((i) => i.verification !== 'PENDING').length;
  return { ...cycle, progress: cycle.items.length ? Math.round((done / cycle.items.length) * 100) : 0, total: cycle.items.length, done };
}

async function assertAuditor(cycleId: string, actor: AuthUser) {
  if (actor.role === 'ADMIN') return;
  const assigned = await prisma.auditAssignment.findFirst({ where: { cycleId, auditorId: actor.id } });
  if (!assigned) throw forbidden('You are not assigned to this audit cycle');
}

export async function markItem(actor: AuthUser, itemId: string, input: { verification: 'VERIFIED' | 'MISSING' | 'DAMAGED'; notes?: string }) {
  const item = await prisma.auditItem.findUnique({ where: { id: itemId }, include: { cycle: true, asset: true } });
  if (!item) throw notFound('Audit item not found');
  if (item.cycle.status === 'CLOSED') throw badRequest('This audit cycle is closed');
  await assertAuditor(item.cycleId, actor);

  const updated = await prisma.auditItem.update({
    where: { id: itemId },
    data: { verification: input.verification, notes: input.notes || null, verifiedById: actor.id, verifiedAt: new Date() },
    include: { asset: { select: { assetTag: true, name: true } } },
  });
  await logActivity({ actorId: actor.id, action: 'AUDIT_ITEM_MARKED', entityType: 'AuditItem', entityId: itemId, metadata: { assetTag: item.asset.assetTag, verification: input.verification } });

  if (input.verification === 'MISSING' || input.verification === 'DAMAGED') {
    await notifyMany(
      (await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } }, select: { id: true } })).map((u) => u.id),
      { type: 'AUDIT_DISCREPANCY', title: 'Audit discrepancy flagged', body: `${item.asset.assetTag} marked ${input.verification}.`, link: `/audits/${item.cycleId}` },
    );
  }
  emitBroadcast('audit:progress', { cycleId: item.cycleId });
  return updated;
}

/** By-tag marker used by the QR "audit mode" scanner. */
export async function markByTag(actor: AuthUser, cycleId: string, assetTag: string, verification: 'VERIFIED' | 'MISSING' | 'DAMAGED', notes?: string) {
  const asset = await prisma.asset.findUnique({ where: { assetTag } });
  if (!asset) throw notFound(`No asset with tag ${assetTag}`);
  const item = await prisma.auditItem.findUnique({ where: { cycleId_assetId: { cycleId, assetId: asset.id } } });
  if (!item) throw badRequest(`${assetTag} is not in the scope of this audit cycle`);
  return markItem(actor, item.id, { verification, notes });
}

export async function discrepancyReport(id: string) {
  const cycle = await prisma.auditCycle.findUnique({ where: { id } });
  if (!cycle) throw notFound('Audit cycle not found');
  const items = await prisma.auditItem.findMany({
    where: { cycleId: id, verification: { in: ['MISSING', 'DAMAGED'] } },
    include: { asset: { select: { assetTag: true, name: true, location: true } }, verifiedBy: { select: { name: true } } },
    orderBy: { verification: 'asc' },
  });
  return { cycle: { id: cycle.id, name: cycle.name, status: cycle.status }, generatedAt: new Date(), discrepancies: items };
}

export function discrepancyCsv(report: Awaited<ReturnType<typeof discrepancyReport>>): string {
  const header = 'Asset Tag,Name,Expected Location,Verification,Notes,Verified By';
  const rows = report.discrepancies.map((d) =>
    [d.asset.assetTag, d.asset.name, d.expectedLocation ?? '', d.verification, (d.notes ?? '').replace(/,/g, ';'), d.verifiedBy?.name ?? ''].join(','),
  );
  return [header, ...rows].join('\n');
}

export async function closeCycle(actor: AuthUser, id: string) {
  const cycle = await prisma.auditCycle.findUnique({ where: { id }, include: { items: { include: { asset: true } } } });
  if (!cycle) throw notFound('Audit cycle not found');
  if (cycle.status === 'CLOSED') throw badRequest('Cycle is already closed');

  const missing = cycle.items.filter((i) => i.verification === 'MISSING');
  const damaged = cycle.items.filter((i) => i.verification === 'DAMAGED');

  await prisma.$transaction(async (tx) => {
    // Confirmed-missing → LOST.
    for (const item of missing) {
      try {
        await changeStatus(item.assetId, 'LOST', actor.id, 'AUDIT_MARKED_LOST', tx);
      } catch {
        /* skip assets not in a transitionable state */
      }
    }
    // Damaged → auto-create a PENDING maintenance request.
    for (const item of damaged) {
      await tx.maintenanceRequest.create({
        data: { assetId: item.assetId, raisedById: actor.id, issue: `Flagged DAMAGED during audit "${cycle.name}". ${item.notes ?? ''}`.trim(), priority: 'HIGH' },
      });
      await logActivity({ actorId: actor.id, action: 'MAINTENANCE_RAISED', entityType: 'Asset', entityId: item.assetId, metadata: { source: 'audit', assetTag: item.asset.assetTag } }, tx);
    }
    await tx.auditCycle.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } });
  });

  await logActivity({ actorId: actor.id, action: 'AUDIT_CYCLE_CLOSED', entityType: 'AuditCycle', entityId: id, metadata: { lost: missing.length, damaged: damaged.length } });
  emitBroadcast('audit:progress', { cycleId: id });
  emitBroadcast('kpi:refresh', { reason: 'audit_close' });
  return { closed: true, lost: missing.length, maintenanceCreated: damaged.length };
}
