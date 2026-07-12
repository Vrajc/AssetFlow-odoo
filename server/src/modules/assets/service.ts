import { AssetStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, conflict, notFound } from '../../utils/errors';
import { assertTransition } from '../../utils/stateMachine';
import { generateAssetTag } from '../../utils/assetTag';
import { logActivity } from '../activity/service';
import { emitBroadcast } from '../../sockets';

const assetInclude = {
  category: { select: { id: true, name: true, customFields: true } },
  department: { select: { id: true, name: true } },
} satisfies Prisma.AssetInclude;

export interface AssetFilters {
  q?: string;
  categoryId?: string;
  status?: AssetStatus;
  departmentId?: string;
  location?: string;
  isBookable?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listAssets(filters: AssetFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.pageSize ?? 20);
  const where: Prisma.AssetWhereInput = {};
  if (filters.q) {
    where.OR = [
      { assetTag: { contains: filters.q, mode: 'insensitive' } },
      { serialNumber: { contains: filters.q, mode: 'insensitive' } },
      { name: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status) where.status = filters.status;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  if (filters.location) where.location = { contains: filters.location, mode: 'insensitive' };
  if (filters.isBookable !== undefined) where.isBookable = filters.isBookable;

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: assetInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getAsset(id: string) {
  // Accept either cuid id or asset tag.
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ id }, { assetTag: id }] },
    include: {
      ...assetInclude,
      allocations: {
        include: { allocatedTo: { select: { id: true, name: true } }, department: { select: { name: true } } },
        orderBy: { allocatedAt: 'desc' },
      },
      maintenanceRequests: {
        include: { raisedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!asset) throw notFound('Asset not found');

  // Lifecycle timeline derived from activity log.
  const timeline = await prisma.activityLog.findMany({
    where: { entityType: 'Asset', entityId: asset.id },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return { ...asset, timeline };
}

export async function createAsset(
  actorId: string,
  input: {
    name: string;
    categoryId: string;
    serialNumber?: string;
    acquisitionDate?: string;
    acquisitionCost?: number;
    condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
    location?: string;
    photoUrl?: string;
    customFieldValues?: Prisma.InputJsonValue;
    isBookable?: boolean;
    departmentId?: string;
  },
) {
  const asset = await prisma.$transaction(async (tx) => {
    const assetTag = await generateAssetTag(tx);
    return tx.asset.create({
      data: {
        assetTag,
        name: input.name,
        categoryId: input.categoryId,
        serialNumber: input.serialNumber || null,
        acquisitionDate: input.acquisitionDate ? new Date(input.acquisitionDate) : null,
        acquisitionCost: input.acquisitionCost ?? null,
        condition: input.condition ?? 'GOOD',
        location: input.location || null,
        photoUrl: input.photoUrl || null,
        customFieldValues: input.customFieldValues,
        isBookable: input.isBookable ?? false,
        departmentId: input.departmentId || null,
      },
      include: assetInclude,
    });
  });
  await logActivity({ actorId, action: 'ASSET_REGISTERED', entityType: 'Asset', entityId: asset.id, metadata: { assetTag: asset.assetTag, name: asset.name } });
  emitBroadcast('kpi:refresh', { reason: 'asset_created' });
  return asset;
}

export async function updateAsset(actorId: string, id: string, input: Record<string, unknown>) {
  const data: Prisma.AssetUpdateInput = {};
  const allowed = ['name', 'location', 'condition', 'isBookable', 'photoUrl', 'serialNumber'];
  for (const key of allowed) if (key in input) (data as Record<string, unknown>)[key] = input[key];
  if ('acquisitionDate' in input && input.acquisitionDate) data.acquisitionDate = new Date(input.acquisitionDate as string);
  if ('acquisitionCost' in input) data.acquisitionCost = input.acquisitionCost as number;
  if ('customFieldValues' in input) data.customFieldValues = input.customFieldValues as Prisma.InputJsonValue;
  if ('categoryId' in input && input.categoryId) data.category = { connect: { id: input.categoryId as string } };
  if ('departmentId' in input) {
    data.department = input.departmentId ? { connect: { id: input.departmentId as string } } : { disconnect: true };
  }
  const asset = await prisma.asset.update({ where: { id }, data, include: assetInclude });
  await logActivity({ actorId, action: 'ASSET_UPDATED', entityType: 'Asset', entityId: id });
  return asset;
}

/** Central helper to change asset status through the state machine. */
export async function changeStatus(
  assetId: string,
  to: AssetStatus,
  actorId: string | null,
  action: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const asset = await client.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw notFound('Asset not found');
  assertTransition(asset.status, to);
  const updated = await client.asset.update({ where: { id: assetId }, data: { status: to } });
  await logActivity({ actorId, action, entityType: 'Asset', entityId: assetId, metadata: { from: asset.status, to } }, tx);
  emitBroadcast('asset:updated', { id: assetId, status: to });
  emitBroadcast('kpi:refresh', { reason: 'asset_status' });
  return updated;
}

export async function retireAsset(actorId: string, id: string) {
  return changeStatus(id, 'RETIRED', actorId, 'ASSET_RETIRED');
}

export async function disposeAsset(actorId: string, id: string) {
  return changeStatus(id, 'DISPOSED', actorId, 'ASSET_DISPOSED');
}

export function qrPayload(assetTag: string) {
  return `assetflow://asset/${assetTag}`;
}

export async function lookupQr(scanned: string) {
  const tag = scanned.replace('assetflow://asset/', '').trim();
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ assetTag: tag }, { serialNumber: tag }] },
    include: assetInclude,
  });
  if (!asset) throw notFound(`No asset matches "${tag}"`);
  return asset;
}
