import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import * as service from './service';

const router = Router();
router.use(authenticate);

router.get('/resources', asyncHandler(async (_req, res) => res.json(await service.listResources())));

router.get(
  '/resources/:id/bookings',
  asyncHandler(async (req, res) =>
    res.json(await service.resourceBookings(req.params.id, req.query.from as string | undefined, req.query.to as string | undefined)),
  ),
);

router.get('/bookings/mine', asyncHandler(async (req, res) => res.json(await service.myBookings(req.user!.id))));

router.post(
  '/bookings',
  validate(z.object({
    resourceId: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    purpose: z.string().optional(),
    onBehalfOfDepartmentId: z.string().optional(),
  })),
  asyncHandler(async (req, res) => res.status(201).json(await service.createBooking(req.user!, req.body))),
);

router.patch(
  '/bookings/:id/cancel',
  asyncHandler(async (req, res) => res.json(await service.cancelBooking(req.user!, req.params.id))),
);

router.patch(
  '/bookings/:id/reschedule',
  validate(z.object({ startTime: z.string().min(1), endTime: z.string().min(1) })),
  asyncHandler(async (req, res) => res.json(await service.rescheduleBooking(req.user!, req.params.id, req.body))),
);

export default router;
