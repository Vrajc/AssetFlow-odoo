import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors';
import { changeStatus } from '../assets/service';
import { logActivity } from '../activity/service';
import { notify, notifyMany } from '../notifications/service';
import { emitBroadcast, emitToManagers } from '../../sockets';
import { AuthUser } from '../../middleware/auth';

const allocationInclude = {
  asset: { select: { id: true, assetTag: true, name: true, status: true } },
  allocatedTo: { select: { id: true, name: true, department: { select: { name: true } } } },
  department: { select: { id: true, name: true } },
} satisfies Prisma.AllocationInclude;

async function managerIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] }, status: 'ACTIVE' }, select: { id: true } });
  return rows.map((r) => r.id);
}

/* ------------------------------ Allocations ------------------------------- */

export async function listAllocations(filters: { assetId?: string; userId?: string; status?: string; overdue?: boolean }) {
  const where: Prisma.AllocationWhereInput = {};
  if (filters.assetId) where.assetId = filters.assetId;
  if (filters.userId) where.allocatedToId = filters.userId;
  if (filters.status) where.status = filters.status as never;
  if (filters.overdue) {
    where.status = { in: ['ACTIVE', 'OVERDUE'] };
    where.expectedReturnDate = { lt: new Date() };
    where.returnedAt = null;
  }
  return prisma.allocation.findMany({ where, include: allocationInclude, orderBy: { allocatedAt: 'desc' } });
}

export async function createAllocation(
  actorId: string,
  input: { assetId: string; allocatedToId: string; departmentId?: string; expectedReturnDate?: string },
) {
  const asset = await prisma.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) throw notFound('Asset not found');

  // CONFLICT RULE: block if an ACTIVE (or OVERDUE) allocation already exists.
  const active = await prisma.allocation.findFirst({
    where: { assetId: input.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } },
    include: { allocatedTo: { select: { name: true, department: { select: { name: true } } } } },
  });
  if (active) {
    throw conflict('ASSET_ALREADY_ALLOCATED', `${asset.name} is currently held by ${active.allocatedTo.name}.`, {
      currentHolder: {
        name: active.allocatedTo.name,
        department: active.allocatedTo.department?.name ?? null,
      },
      suggestion: 'TRANSFER_REQUEST',
    });
  }

  if (asset.status !== 'AVAILABLE') {
    throw conflict('ASSET_NOT_AVAILABLE', `${asset.name} is ${asset.status} and cannot be allocated.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const allocation = await tx.allocation.create({
      data: {
        assetId: input.assetId,
        allocatedToId: input.allocatedToId,
        departmentId: input.departmentId || null,
        expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
      },
      include: allocationInclude,
    });
    await changeStatus(input.assetId, 'ALLOCATED', actorId, 'ASSET_ALLOCATED', tx);
    return allocation;
  });

  await notify({
    userId: input.allocatedToId,
    type: 'ASSET_ASSIGNED',
    title: 'Asset assigned to you',
    body: `${asset.assetTag} — ${asset.name} has been allocated to you.`,
    link: `/assets/${asset.assetTag}`,
  });
  emitBroadcast('kpi:refresh', { reason: 'allocation' });
  return result;
}

export async function returnAllocation(
  actor: AuthUser,
  id: string,
  input: { condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string },
) {
  const allocation = await prisma.allocation.findUnique({ where: { id }, include: { asset: true } });
  if (!allocation) throw notFound('Allocation not found');
  if (allocation.status === 'RETURNED') throw badRequest('This allocation was already returned');

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.allocation.update({
      where: { id },
      data: {
        status: 'RETURNED',
        returnedAt: new Date(),
        checkInNotes: input.notes || null,
        checkInCondition: input.condition || null,
      },
      include: allocationInclude,
    });
    if (input.condition) {
      await tx.asset.update({ where: { id: allocation.assetId }, data: { condition: input.condition } });
    }
    await changeStatus(allocation.assetId, 'AVAILABLE', actor.id, 'ASSET_RETURNED', tx);
    return updated;
  });

  await notify({
    userId: allocation.allocatedToId,
    type: 'ASSET_ASSIGNED',
    title: 'Return confirmed',
    body: `Return of ${allocation.asset.assetTag} has been confirmed.`,
    link: `/assets/${allocation.asset.assetTag}`,
  });
  emitBroadcast('kpi:refresh', { reason: 'return' });
  return result;
}

/* ------------------------------- Transfers -------------------------------- */

const transferInclude = {
  asset: { select: { id: true, assetTag: true, name: true } },
  fromUser: { select: { id: true, name: true } },
  toUser: { select: { id: true, name: true, departmentId: true } },
  requestedBy: { select: { id: true, name: true } },
} satisfies Prisma.TransferRequestInclude;

export async function listTransfers(filters: { status?: string }) {
  const where: Prisma.TransferRequestWhereInput = {};
  if (filters.status) where.status = filters.status as never;
  return prisma.transferRequest.findMany({ where, include: transferInclude, orderBy: { createdAt: 'desc' } });
}

export async function createTransfer(actorId: string, input: { assetId: string; toUserId: string; reason: string }) {
  const active = await prisma.allocation.findFirst({
    where: { assetId: input.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } },
  });
  if (!active) throw badRequest('This asset is not currently allocated, so it can be allocated directly.');
  if (active.allocatedToId === input.toUserId) throw badRequest('Asset is already held by that user');

  const transfer = await prisma.transferRequest.create({
    data: {
      assetId: input.assetId,
      fromUserId: active.allocatedToId,
      toUserId: input.toUserId,
      requestedById: actorId,
      reason: input.reason,
    },
    include: transferInclude,
  });
  await logActivity({ actorId, action: 'TRANSFER_REQUESTED', entityType: 'TransferRequest', entityId: transfer.id, metadata: { assetTag: transfer.asset.assetTag } });
  await notifyMany(await managerIds(), {
    type: 'TRANSFER_UPDATE',
    title: 'Transfer request awaiting approval',
    body: `${transfer.asset.assetTag} — ${transfer.fromUser.name} → ${transfer.toUser.name}`,
    link: '/allocations',
  });
  emitToManagers('transfer:updated', transfer);
  return transfer;
}

export async function approveTransfer(actor: AuthUser, id: string) {
  const transfer = await prisma.transferRequest.findUnique({ where: { id }, include: transferInclude });
  if (!transfer) throw notFound('Transfer request not found');
  if (transfer.status !== 'REQUESTED') throw badRequest('This transfer has already been decided');

  // Dept heads may only approve transfers where the target is in their department.
  if (actor.role === 'DEPARTMENT_HEAD' && transfer.toUser.departmentId !== actor.departmentId) {
    throw forbidden('Department heads can only approve transfers into their own department');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Close the current active allocation.
    await tx.allocation.updateMany({
      where: { assetId: transfer.assetId, status: { in: ['ACTIVE', 'OVERDUE'] } },
      data: { status: 'RETURNED', returnedAt: new Date() },
    });
    // Create the new active allocation for the target user.
    await tx.allocation.create({
      data: { assetId: transfer.assetId, allocatedToId: transfer.toUserId },
    });
    // Asset stays ALLOCATED — just to a new holder. Log the re-allocation.
    await logActivity({ actorId: actor.id, action: 'ASSET_REALLOCATED', entityType: 'Asset', entityId: transfer.assetId, metadata: { from: transfer.fromUser.name, to: transfer.toUser.name } }, tx);
    return tx.transferRequest.update({
      where: { id },
      data: { status: 'COMPLETED', decidedById: actor.id, decidedAt: new Date() },
      include: transferInclude,
    });
  });

  await logActivity({ actorId: actor.id, action: 'TRANSFER_APPROVED', entityType: 'TransferRequest', entityId: id });
  await notify({ userId: transfer.toUserId, type: 'TRANSFER_UPDATE', title: 'Transfer approved', body: `${transfer.asset.assetTag} is now allocated to you.`, link: `/assets/${transfer.asset.assetTag}` });
  await notify({ userId: transfer.fromUserId, type: 'TRANSFER_UPDATE', title: 'Asset transferred', body: `${transfer.asset.assetTag} was transferred to ${transfer.toUser.name}.`, link: '/allocations' });
  emitBroadcast('transfer:updated', result);
  emitBroadcast('kpi:refresh', { reason: 'transfer' });
  return result;
}

export async function rejectTransfer(actor: AuthUser, id: string, reason: string) {
  const transfer = await prisma.transferRequest.findUnique({ where: { id }, include: transferInclude });
  if (!transfer) throw notFound('Transfer request not found');
  if (transfer.status !== 'REQUESTED') throw badRequest('This transfer has already been decided');

  const result = await prisma.transferRequest.update({
    where: { id },
    data: { status: 'REJECTED', decidedById: actor.id, decidedAt: new Date(), reason: reason || transfer.reason },
    include: transferInclude,
  });
  await logActivity({ actorId: actor.id, action: 'TRANSFER_REJECTED', entityType: 'TransferRequest', entityId: id });
  await notify({ userId: transfer.requestedById, type: 'TRANSFER_UPDATE', title: 'Transfer rejected', body: `Your transfer request for ${transfer.asset.assetTag} was rejected.`, link: '/allocations' });
  emitBroadcast('transfer:updated', result);
  return result;
}
