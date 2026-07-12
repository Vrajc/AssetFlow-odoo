import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { prisma } from '../../lib/prisma';

const router = Router();
router.use(authenticate);

// Full audit log — managers & admins.
router.get(
  '/',
  requireRole('ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'),
  asyncHandler(async (req, res) => {
    const where: Prisma.ActivityLogWhereInput = {};
    if (req.query.entityType) where.entityType = req.query.entityType as string;
    if (req.query.entityId) where.entityId = req.query.entityId as string;
    if (req.query.actorId) where.actorId = req.query.actorId as string;
    const items = await prisma.activityLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(items);
  }),
);

export default router;
