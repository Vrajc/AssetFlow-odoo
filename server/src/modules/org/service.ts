import { Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { badRequest, notFound } from '../../utils/errors';
import { logActivity } from '../activity/service';
import { notify } from '../notifications/service';

/* ------------------------------- Departments ------------------------------ */

export async function listDepartments() {
  return prisma.department.findMany({
    include: {
      head: { select: { id: true, name: true } },
      parent: { select: { id: true, name: true } },
      _count: { select: { members: true, assets: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createDepartment(
  actorId: string,
  input: { name: string; headId?: string; parentId?: string; status?: 'ACTIVE' | 'INACTIVE' },
) {
  const dept = await prisma.department.create({ data: input });
  await logActivity({ actorId, action: 'DEPARTMENT_CREATED', entityType: 'Department', entityId: dept.id, metadata: { name: dept.name } });
  return dept;
}

export async function updateDepartment(
  actorId: string,
  id: string,
  input: Partial<{ name: string; headId: string | null; parentId: string | null; status: 'ACTIVE' | 'INACTIVE' }>,
) {
  if (input.parentId === id) throw badRequest('A department cannot be its own parent');
  const dept = await prisma.department.update({ where: { id }, data: input });

  // Promote assigned head to DEPARTMENT_HEAD role automatically.
  if (input.headId) {
    await prisma.user.update({ where: { id: input.headId }, data: { role: 'DEPARTMENT_HEAD', departmentId: id } });
  }
  await logActivity({ actorId, action: 'DEPARTMENT_UPDATED', entityType: 'Department', entityId: id });
  return dept;
}

export async function deactivateDepartment(actorId: string, id: string) {
  const dept = await prisma.department.update({ where: { id }, data: { status: 'INACTIVE' } });
  await logActivity({ actorId, action: 'DEPARTMENT_DEACTIVATED', entityType: 'Department', entityId: id });
  return dept;
}

/* ------------------------------- Categories ------------------------------- */

export async function listCategories() {
  return prisma.assetCategory.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(
  actorId: string,
  input: { name: string; customFields?: Prisma.InputJsonValue },
) {
  const cat = await prisma.assetCategory.create({ data: input });
  await logActivity({ actorId, action: 'CATEGORY_CREATED', entityType: 'AssetCategory', entityId: cat.id, metadata: { name: cat.name } });
  return cat;
}

export async function updateCategory(
  actorId: string,
  id: string,
  input: { name?: string; customFields?: Prisma.InputJsonValue },
) {
  const cat = await prisma.assetCategory.update({ where: { id }, data: input });
  await logActivity({ actorId, action: 'CATEGORY_UPDATED', entityType: 'AssetCategory', entityId: id });
  return cat;
}

export async function deleteCategory(actorId: string, id: string) {
  const count = await prisma.asset.count({ where: { categoryId: id } });
  if (count > 0) throw badRequest('Cannot delete a category that still has assets');
  await prisma.assetCategory.delete({ where: { id } });
  await logActivity({ actorId, action: 'CATEGORY_DELETED', entityType: 'AssetCategory', entityId: id });
  return { ok: true };
}

/* --------------------------- Employee directory --------------------------- */

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
} as const;

export async function listUsers(filters: { q?: string; role?: Role; status?: UserStatus; departmentId?: string }) {
  const where: Prisma.UserWhereInput = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { email: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;
  if (filters.departmentId) where.departmentId = filters.departmentId;
  return prisma.user.findMany({ where, select: userSelect, orderBy: { name: 'asc' } });
}

export async function setUserRole(actorId: string, id: string, role: Role) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('User not found');
  const updated = await prisma.user.update({ where: { id }, data: { role }, select: userSelect });
  await logActivity({ actorId, action: 'USER_ROLE_CHANGED', entityType: 'User', entityId: id, metadata: { from: user.role, to: role } });
  await notify({
    userId: id,
    type: 'SYSTEM',
    title: 'Your role was updated',
    body: `An administrator set your role to ${role.replace('_', ' ').toLowerCase()}.`,
    link: '/dashboard',
  });
  return updated;
}

export async function setUserStatus(actorId: string, id: string, status: UserStatus) {
  const updated = await prisma.user.update({ where: { id }, data: { status }, select: userSelect });
  await logActivity({ actorId, action: 'USER_STATUS_CHANGED', entityType: 'User', entityId: id, metadata: { status } });
  return updated;
}

export async function setUserDepartment(actorId: string, id: string, departmentId: string | null) {
  const updated = await prisma.user.update({ where: { id }, data: { departmentId }, select: userSelect });
  await logActivity({ actorId, action: 'USER_DEPARTMENT_CHANGED', entityType: 'User', entityId: id, metadata: { departmentId } });
  return updated;
}
