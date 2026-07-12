import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate } from '../../middleware/auth';
import * as service from './service';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => res.json(await service.listNotifications(req.user!.id))));
router.patch('/read-all', asyncHandler(async (req, res) => res.json(await service.markAllRead(req.user!.id))));
router.patch('/:id/read', asyncHandler(async (req, res) => res.json(await service.markRead(req.user!.id, req.params.id))));

export default router;
