import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as service from './service';

const router = Router();
router.use(authenticate);

const managerOnly = requireRole('ADMIN', 'ASSET_MANAGER');
const approverRoles = requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD');

/* Allocations */
router.get(
  '/allocations',
  asyncHandler(async (req, res) =>
    res.json(await service.listAllocations({
      assetId: req.query.assetId as string | undefined,
      userId: req.query.userId as string | undefined,
      status: req.query.status as string | undefined,
      overdue: req.query.overdue === 'true',
    })),
  ),
);

router.post(
  '/allocations',
  managerOnly,
  validate(z.object({
    assetId: z.string().min(1),
    allocatedToId: z.string().min(1),
    departmentId: z.string().optional(),
    expectedReturnDate: z.string().optional(),
  })),
  asyncHandler(async (req, res) => res.status(201).json(await service.createAllocation(req.user!.id, req.body))),
);

router.post(
  '/allocations/:id/return',
  managerOnly,
  validate(z.object({ condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).optional(), notes: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await service.returnAllocation(req.user!, req.params.id, req.body))),
);

/* Transfers */
router.get(
  '/transfers',
  asyncHandler(async (req, res) => res.json(await service.listTransfers({ status: req.query.status as string | undefined }))),
);

router.post(
  '/transfers',
  authenticate,
  validate(z.object({ assetId: z.string().min(1), toUserId: z.string().min(1), reason: z.string().min(3) })),
  asyncHandler(async (req, res) => res.status(201).json(await service.createTransfer(req.user!.id, req.body))),
);

router.post(
  '/transfers/:id/approve',
  approverRoles,
  asyncHandler(async (req, res) => res.json(await service.approveTransfer(req.user!, req.params.id))),
);

router.post(
  '/transfers/:id/reject',
  approverRoles,
  validate(z.object({ reason: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await service.rejectTransfer(req.user!, req.params.id, req.body.reason ?? ''))),
);

export default router;
