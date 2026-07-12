import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { upload } from '../../middleware/upload';
import * as service from './service';

const router = Router();
router.use(authenticate);

const managerOnly = requireRole('ADMIN', 'ASSET_MANAGER');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = req.query;
    res.json(await service.listAssets({
      q: q.q as string | undefined,
      categoryId: q.category as string | undefined,
      status: q.status as never,
      departmentId: q.department as string | undefined,
      location: q.location as string | undefined,
      isBookable: q.isBookable === undefined ? undefined : q.isBookable === 'true',
      page: q.page ? parseInt(q.page as string, 10) : undefined,
      pageSize: q.pageSize ? parseInt(q.pageSize as string, 10) : undefined,
    }));
  }),
);

// Photo upload — returns a URL usable as photoUrl.
router.post(
  '/upload',
  managerOnly,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No file uploaded' } });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  }),
);

const assetSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.number().nonnegative().optional(),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']).optional(),
  location: z.string().optional(),
  photoUrl: z.string().optional(),
  customFieldValues: z.any().optional(),
  isBookable: z.boolean().optional(),
  departmentId: z.string().optional(),
});

router.post(
  '/',
  managerOnly,
  validate(assetSchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.createAsset(req.user!.id, req.body))),
);

router.post(
  '/lookup-qr',
  validate(z.object({ code: z.string().min(1) })),
  asyncHandler(async (req, res) => res.json(await service.lookupQr(req.body.code))),
);

router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getAsset(req.params.id))));

router.get(
  '/:id/qr',
  asyncHandler(async (req, res) => {
    const asset = await service.getAsset(req.params.id);
    res.json({ assetTag: asset.assetTag, name: asset.name, payload: service.qrPayload(asset.assetTag) });
  }),
);

router.patch(
  '/:id',
  managerOnly,
  validate(assetSchema.partial()),
  asyncHandler(async (req, res) => res.json(await service.updateAsset(req.user!.id, req.params.id, req.body))),
);

router.post(
  '/:id/retire',
  managerOnly,
  asyncHandler(async (req, res) => res.json(await service.retireAsset(req.user!.id, req.params.id))),
);

router.post(
  '/:id/dispose',
  managerOnly,
  asyncHandler(async (req, res) => res.json(await service.disposeAsset(req.user!.id, req.params.id))),
);

export default router;
