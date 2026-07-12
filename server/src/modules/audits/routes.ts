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

router.get('/audit-cycles', asyncHandler(async (_req, res) => res.json(await service.listCycles())));

router.post(
  '/audit-cycles',
  adminOnly,
  validate(z.object({
    name: z.string().min(2),
    scopeDepartmentId: z.string().optional(),
    scopeLocation: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    auditorIds: z.array(z.string()).min(1),
  })),
  asyncHandler(async (req, res) => res.status(201).json(await service.createCycle(req.user!.id, req.body))),
);

router.get('/audit-cycles/:id', asyncHandler(async (req, res) => res.json(await service.getCycle(req.params.id))));

router.get('/audit-cycles/:id/discrepancy-report', asyncHandler(async (req, res) => {
  const report = await service.discrepancyReport(req.params.id);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="discrepancy-${req.params.id}.csv"`);
    return res.send(service.discrepancyCsv(report));
  }
  res.json(report);
}));

router.post('/audit-cycles/:id/close', adminOnly, asyncHandler(async (req, res) => res.json(await service.closeCycle(req.user!, req.params.id))));

router.patch(
  '/audit-items/:id',
  validate(z.object({ verification: z.enum(['VERIFIED', 'MISSING', 'DAMAGED']), notes: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await service.markItem(req.user!, req.params.id, req.body))),
);

// QR audit-mode: mark by asset tag within a cycle.
router.post(
  '/audit-cycles/:id/mark-by-tag',
  validate(z.object({ assetTag: z.string().min(1), verification: z.enum(['VERIFIED', 'MISSING', 'DAMAGED']), notes: z.string().optional() })),
  asyncHandler(async (req, res) => res.json(await service.markByTag(req.user!, req.params.id, req.body.assetTag, req.body.verification, req.body.notes))),
);

export default router;
