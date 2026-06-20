// Auth routes: POST /login, POST /logout, GET /me.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getDb } from '../db/connection.ts';
import { verifyPassword } from '../auth/password.ts';
import { createSession, destroySession, readSession } from '../auth/session.ts';
import { asyncHandler, unauthorized } from '../utils/http-error.ts';
import type { MeResponse } from '../../shared/types.ts';

const loginSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Thử lại sau ít phút' },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const db = getDb();
    const row = db
      .prepare('SELECT username, password_hash FROM admins WHERE username = ?')
      .get(username) as { username: string; password_hash: string } | undefined;

    const ok = row ? await verifyPassword(row.password_hash, password) : false;
    if (!ok) throw unauthorized('Sai tài khoản hoặc mật khẩu');

    createSession(res, username);
    res.json({ authenticated: true, username } satisfies MeResponse);
  }),
);

authRouter.post('/logout', (_req, res) => {
  destroySession(res);
  res.json({ authenticated: false } satisfies MeResponse);
});

authRouter.get('/me', (req, res) => {
  const username = readSession(req);
  res.json(
    (username ? { authenticated: true, username } : { authenticated: false }) satisfies MeResponse,
  );
});
