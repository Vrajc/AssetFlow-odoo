import { MaintenanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../utils/errors';
import { changeStatus } from '../assets/service';
import { logActivity } from '../activity/service';
import { notify, notifyMany } from '../notifications/service';
import { emitBroadcast, emitToManagers } from '../../sockets';
import { AuthUser } from '../../middleware/auth';

const include = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  raisedBy: { select: { id: true, name: true } },
  decidedBy: { select: { id: true, name: true } },
} satisfies Prisma.MaintenanceRequestInclude;

const KANBAN_ORDER: MaintenanceStatus[] = ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

async function managerIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] }, status: 'ACTIVE' }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function listMaintenance(status?: string) {
  const where: Prisma.MaintenanceRequestWhereInput = {};
  if (status) where.status = status as never;
  const items = await prisma.maintenanceRequest.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  // Grouped for kanban.
  const board: Record<string, typeof items> = {};
  for (const col of KANBAN_ORDER) board[col] = [];
  for (const item of items) board[item.status]?.push(item);
  return { items, board };
}

export async function raiseRequest(
  actorId: string,
  input: { assetId: string; issue: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; photoUrl?: string },
) {
  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) throw notFound('Asset not found');
  const req = await prisma.maintenanceRequest.create({
    data: { assetId: input.assetId, raisedById: actorId, issue: input.issue, priority: input.priority ?? 'MEDIUM', photoUrl: input.photoUrl || null },
    include,
  });
  await logActivity({ actorId, action: 'MAINTENANCE_RAISED', entityType: 'MaintenanceRequest', entityId: req.id, metadata: { assetTag: asset.assetTag } });
  await notifyMany(await managerIds(), { type: 'MAINTENANCE_UPDATE', title: 'Maintenance request pending', body: `${asset.assetTag} — ${input.issue.slice(0, 60)}`, link: '/maintenance' });
  emitToManagers('maintenance:updated', { id: req.id });
  emitBroadcast('maintenance:updated', { id: req.id });
  return req;
}

/** Validate a workflow transition for the kanban board. */
function assertWorkflow(from: MaintenanceStatus, to: MaintenanceStatus) {
  const allowed: Record<MaintenanceStatus, MaintenanceStatus[]> = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['TECHNICIAN_ASSIGNED'],
    TECHNICIAN_ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: [],
    REJECTED: [],
  };
  if (!allowed[from]?.includes(to)) {
    throw conflict('INVALID_WORKFLOW_TRANSITION', `Cannot move maintenance from ${from} to ${to}.`, { from, to, allowed: allowed[from] });
  }
}

async function load(id: string) {
  const req = await prisma.maintenanceRequest.findUnique({ where: { id }, include });
  if (!req) throw notFound('Maintenance request not found');
  return req;
}

export async function approve(actor: AuthUser, id: string) {
  const req = await load(id);
  assertWorkflow(req.status, 'APPROVED');
  const result = await prisma.$transaction(async (tx) => {
    // Asset → UNDER_MAINTENANCE on approval.
    await changeStatus(req.assetId, 'UNDER_MAINTENANCE', actor.id, 'MAINTENANCE_APPROVED', tx);
    return tx.maintenanceRequest.update({ where: { id }, data: { status: 'APPROVED', decidedById: actor.id }, include });
  });
  await logActivity({ actorId: actor.id, action: 'MAINTENANCE_APPROVED', entityType: 'MaintenanceRequest', entityId: id });
  await notify({ userId: req.raisedById, type: 'MAINTENANCE_UPDATE', title: 'Maintenance approved', body: `Your request for ${req.asset.assetTag} was approved.`, link: '/maintenance' });
  emitBroadcast('maintenance:updated', { id });
  emitBroadcast('kpi:refresh', { reason: 'maintenance' });
  return result;
}

export async function reject(actor: AuthUser, id: string, reason: string) {
  const req = await load(id);
  assertWorkflow(req.status, 'REJECTED');
  const result = await prisma.maintenanceRequest.update({ where: { id }, data: { status: 'REJECTED', decidedById: actor.id, rejectionReason: reason }, include });
  await logActivity({ actorId: actor.id, action: 'MAINTENANCE_REJECTED', entityType: 'MaintenanceRequest', entityId: id });
  await notify({ userId: req.raisedById, type: 'MAINTENANCE_UPDATE', title: 'Maintenance rejected', body: `Your request for ${req.asset.assetTag} was rejected.`, link: '/maintenance' });
  emitBroadcast('maintenance:updated', { id });
  return result;
}

export async function assignTechnician(actor: AuthUser, id: string, technicianName: string) {
  const req = await load(id);
  assertWorkflow(req.status, 'TECHNICIAN_ASSIGNED');
  const result = await prisma.maintenanceRequest.update({ where: { id }, data: { status: 'TECHNICIAN_ASSIGNED', technicianName }, include });
  await logActivity({ actorId: actor.id, action: 'MAINTENANCE_TECH_ASSIGNED', entityType: 'MaintenanceRequest', entityId: id, metadata: { technicianName } });
  emitBroadcast('maintenance:updated', { id });
  return result;
}

export async function start(actor: AuthUser, id: string) {
  const req = await load(id);
  assertWorkflow(req.status, 'IN_PROGRESS');
  const result = await prisma.maintenanceRequest.update({ where: { id }, data: { status: 'IN_PROGRESS' }, include });
  await logActivity({ actorId: actor.id, action: 'MAINTENANCE_STARTED', entityType: 'MaintenanceRequest', entityId: id });
  emitBroadcast('maintenance:updated', { id });
  return result;
}

export async function resolve(actor: AuthUser, id: string, notes?: string) {
  const req = await load(id);
  assertWorkflow(req.status, 'RESOLVED');
  const result = await prisma.$transaction(async (tx) => {
    // Back to ALLOCATED if still actively allocated, else AVAILABLE.
    const active = await tx.allocation.findFirst({ where: { assetId: req.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } } });
    await changeStatus(req.assetId, active ? 'ALLOCATED' : 'AVAILABLE', actor.id, 'MAINTENANCE_RESOLVED', tx);
    return tx.maintenanceRequest.update({ where: { id }, data: { status: 'RESOLVED', resolutionNotes: notes || null, resolvedAt: new Date() }, include });
  });
  await logActivity({ actorId: actor.id, action: 'MAINTENANCE_RESOLVED', entityType: 'MaintenanceRequest', entityId: id });
  await notify({ userId: req.raisedById, type: 'MAINTENANCE_UPDATE', title: 'Maintenance resolved', body: `${req.asset.assetTag} is back in service.`, link: `/assets/${req.asset.assetTag}` });
  emitBroadcast('maintenance:updated', { id });
  emitBroadcast('kpi:refresh', { reason: 'maintenance' });
  return result;
}

/** Generic transition used by the kanban drag handler. */
export async function moveCard(actor: AuthUser, id: string, to: MaintenanceStatus, extra: { reason?: string; technicianName?: string; notes?: string }) {
  switch (to) {
    case 'APPROVED': return approve(actor, id);
    case 'REJECTED': return reject(actor, id, extra.reason ?? 'Rejected');
    case 'TECHNICIAN_ASSIGNED': return assignTechnician(actor, id, extra.technicianName ?? 'Unassigned technician');
    case 'IN_PROGRESS': return start(actor, id);
    case 'RESOLVED': return resolve(actor, id, extra.notes);
    default: throw badRequest('Unsupported target column');
  }
}
