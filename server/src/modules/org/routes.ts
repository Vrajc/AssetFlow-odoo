import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as service from './service';

const router = Router();
router.use(authenticate);

const adminOnly = requireRole('ADMIN');

/* Departments — readable by any authenticated user (drives pickers). */
router.get('/departments', asyncHandler(async (_req, res) => res.json(await service.listDepartments())));

router.post(
  '/departments',
  adminOnly,
  validate(z.object({
    name: z.string().min(2),
    headId: z.string().optional(),
    parentId: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })),
  asyncHandler(async (req, res) => res.status(201).json(await service.createDepartment(req.user!.id, req.body))),
);

router.patch(
  '/departments/:id',
  adminOnly,
  validate(z.object({
    name: z.string().min(2).optional(),
    headId: z.string().nullable().optional(),
    parentId: z.string().nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })),
  asyncHandler(async (req, res) => res.json(await service.updateDepartment(req.user!.id, req.params.id, req.body))),
);

router.post(
  '/departments/:id/deactivate',
  adminOnly,
  asyncHandler(async (req, res) => res.json(await service.deactivateDepartment(req.user!.id, req.params.id))),
);

/* Categories */
router.get('/categories', asyncHandler(async (_req, res) => res.json(await service.listCategories())));

router.post(
  '/categories',
  adminOnly,
  validate(z.object({ name: z.string().min(2), customFields: z.any().optional() })),
  asyncHandler(async (req, res) => res.status(201).json(await service.createCategory(req.user!.id, req.body))),
);

router.patch(
  '/categories/:id',
  adminOnly,
  validate(z.object({ name: z.string().min(2).optional(), customFields: z.any().optional() })),
  asyncHandler(async (req, res) => res.json(await service.updateCategory(req.user!.id, req.params.id, req.body))),
);

router.delete(
  '/categories/:id',
  adminOnly,
  asyncHandler(async (req, res) => res.json(await service.deleteCategory(req.user!.id, req.params.id))),
);

/* Employee directory */
router.get(
  '/users',
  asyncHandler(async (req, res) =>
    res.json(await service.listUsers({
      q: req.query.q as string | undefined,
      role: req.query.role as never,
      status: req.query.status as never,
      departmentId: req.query.departmentId as string | undefined,
    })),
  ),
);

router.patch(
  '/users/:id/role',
  adminOnly,
  validate(z.object({ role: z.enum(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE']) })),
  asyncHandler(async (req, res) => res.json(await service.setUserRole(req.user!.id, req.params.id, req.body.role))),
);

router.patch(
  '/users/:id/status',
  adminOnly,
  validate(z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) })),
  asyncHandler(async (req, res) => res.json(await service.setUserStatus(req.user!.id, req.params.id, req.body.status))),
);

router.patch(
  '/users/:id/department',
  adminOnly,
  validate(z.object({ departmentId: z.string().nullable() })),
  asyncHandler(async (req, res) => res.json(await service.setUserDepartment(req.user!.id, req.params.id, req.body.departmentId))),
);

export default router;
