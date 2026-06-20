// Session stateless: cookie httpOnly ký bằng SESSION_SECRET (cookie-signature).
// Single admin → không cần server-side store; logout = clear cookie.
import type { Request, Response } from 'express';
import { sign, unsign } from 'cookie-signature';
import { env } from '../env.ts';

const COOKIE_NAME = 'bh_session';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export function createSession(res: Response, username: string): void {
  const value = sign(username, env.sessionSecret);
  res.cookie(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function readSession(req: Request): string | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw || typeof raw !== 'string') return null;
  const username = unsign(raw, env.sessionSecret);
  return username === false ? null : username;
}

export function destroySession(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}
