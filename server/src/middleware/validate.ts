import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/errors';

type Part = 'body' | 'query' | 'params';

/** Validate a request part against a zod schema; replaces it with parsed data. */
export function validate(schema: ZodSchema, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      // query/params are read-only getters in Express 5; assign fields safely
      if (part === 'body') req.body = parsed;
      else Object.assign(req[part], parsed);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', err.flatten()),
        );
      }
      next(err);
    }
  };
}
