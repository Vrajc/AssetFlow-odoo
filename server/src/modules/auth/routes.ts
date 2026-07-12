import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import * as service from './service';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/signup',
  validate(signupSchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.signup(req.body))),
);

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => res.json(await service.login(req.body))),
);

router.post(
  '/forgot-password',
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => res.json(await service.forgotPassword(req.body.email))),
);

router.post(
  '/reset-password',
  validate(z.object({ token: z.string().min(1), password: z.string().min(6) })),
  asyncHandler(async (req, res) =>
    res.json(await service.resetPassword(req.body.token, req.body.password)),
  ),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => res.json(await service.me(req.user!.id))),
);

export default router;
