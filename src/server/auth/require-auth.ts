// Middleware: chặn /api/admin/* nếu chưa có session hợp lệ.
import type { NextFunction, Request, Response } from 'express';
import { readSession } from './session.ts';
import { unauthorized } from '../utils/http-error.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUsername?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const username = readSession(req);
  if (!username) {
    next(unauthorized());
    return;
  }
  req.adminUsername = username;
  next();
}
