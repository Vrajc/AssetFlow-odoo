import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import * as service from './service';

const router = Router();
router.use(authenticate);

router.get('/kpis', asyncHandler(async (_req, res) => res.json(await service.kpis())));
router.get('/overdue', asyncHandler(async (_req, res) => res.json(await service.overdueList())));
router.get('/utilization', asyncHandler(async (req, res) =>
  res.json(await service.utilization((req.query.groupBy as 'department' | 'category') ?? 'department')),
));
router.get('/maintenance-frequency', asyncHandler(async (_req, res) => res.json(await service.maintenanceFrequency())));
router.get('/most-used-idle', asyncHandler(async (_req, res) => res.json(await service.mostUsedIdle())));
router.get('/due-soon', asyncHandler(async (_req, res) => res.json(await service.dueSoon())));
router.get('/booking-heatmap', asyncHandler(async (_req, res) => res.json(await service.bookingHeatmap())));
router.get('/dept-allocation', asyncHandler(async (_req, res) => res.json(await service.deptAllocationSummary())));

// CSV export.
router.get('/export', asyncHandler(async (req, res) => {
  const type = (req.query.type as string) ?? 'utilization';
  let rows: string[][] = [];
  let header: string[] = [];
  if (type === 'utilization') {
    const data = await service.utilization('department');
    header = ['Department', 'Total', 'Allocated', 'Available', 'Maintenance', 'Utilization %'];
    rows = data.map((d) => [d.name, `${d.total}`, `${d.allocated}`, `${d.available}`, `${d.maintenance}`, `${d.utilizationPct}`]);
  } else if (type === 'most-used') {
    const data = await service.mostUsedIdle();
    header = ['Asset Tag', 'Name', 'Uses'];
    rows = data.mostUsed.map((d) => [d.assetTag, d.name, `${d.uses}`]);
  } else if (type === 'dept-allocation') {
    const data = await service.deptAllocationSummary();
    header = ['Department', 'Assets', 'Members'];
    rows = data.map((d) => [d.name, `${d.assets}`, `${d.members}`]);
  }
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
  res.send(csv);
}));

export default router;
