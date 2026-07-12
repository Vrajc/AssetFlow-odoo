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

router.get('/', asyncHandler(async (req, res) => res.json(await service.listMaintenance(req.query.status as string | undefined))));

router.post(
  '/',
  validate(z.object({
    assetId: z.string().min(1),
    issue: z.string().min(3),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    photoUrl: z.string().optional(),
  })),
  asyncHandler(async (req, res) => res.status(201).json(await service.raiseRequest(req.user!.id, req.body))),
);

router.post('/:id/approve', managerOnly, asyncHandler(async (req, res) => res.json(await service.approve(req.user!, req.params.id))));

router.post(
  '/:id/reject',
  managerOnly,
  validate(z.object({ reason: z.string().min(1) })),
  asyncHandler(async (req, res) => res.json(await service.reject(req.user!, req.params.id, req.body.reason))),
);

router.post(
  '/:id/assign-technician',
  managerOnly,
  validate(z.object({ technicianName: z.string().min(1) })),
  asyncHandler(async (req, res) => res.json(await service.assignTechnician(req.user!, req.params.id, req.body.technicianName))),
);

router.post('/:id/start', managerOnly, asyncHandler(async (req, res) => res.json(await service.start(req.user!, req.params.id))));

router.post(
  '/:id/resolve',
  managerOnly,
  validate(z.object({ notes: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await service.resolve(req.user!, req.params.id, req.body.notes))),
);

// Kanban drag → generic move.
router.post(
  '/:id/move',
  managerOnly,
  validate(z.object({
    to: z.enum(['APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED']),
    reason: z.string().optional(),
    technicianName: z.string().optional(),
    notes: z.string().optional(),
  })),
  asyncHandler(async (req, res) => res.json(await service.moveCard(req.user!, req.params.id, req.body.to, req.body))),
);

export default router;
