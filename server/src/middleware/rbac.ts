import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../utils/errors';

/** Require the authenticated user to hold one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

export const isManager = (role: Role) => role === 'ADMIN' || role === 'ASSET_MANAGER';
