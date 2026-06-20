// Lắp ráp Express app: middleware → routes → static client → error handler.
import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { env } from './env.ts';
import { errorHandler } from './utils/http-error.ts';
import { requireAuth } from './auth/require-auth.ts';
import { authRouter } from './routes/auth.ts';
import { adminSettingsRouter } from './routes/admin-settings.ts';
import { adminMembersRouter } from './routes/admin-members.ts';
import { adminSessionsRouter } from './routes/admin-sessions.ts';
import { adminParticipantsRouter } from './routes/admin-participants.ts';
import { adminCostItemsRouter } from './routes/admin-cost-items.ts';
import { adminSplitRouter } from './routes/admin-split.ts';
import { adminPaymentsRouter } from './routes/admin-payments.ts';
import { adminDebtsRouter } from './routes/admin-debts.ts';
import { adminBackupRouter } from './routes/admin-backup.ts';
import { adminReportsRouter } from './routes/admin-reports.ts';
import { publicSessionsRouter } from './routes/public-sessions.ts';
import { publicBillsRouter } from './routes/public-bills.ts';

export function createApp(): express.Express {
  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);

  // 25mb để cho phép import backup JSON lớn (gồm QR base64). QR upload ≤2MB vẫn ổn.
  app.use(express.json({ limit: '25mb' }));
  app.use(cookieParser());

  // Health check (Docker HEALTHCHECK).
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Auth (public).
  app.use('/api/auth', authRouter);

  // Public token routes: no-referrer + no-store headers (chống token leak).
  const publicTokenHeaders = express.Router();
  publicTokenHeaders.use((_req, res, next) => {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  publicTokenHeaders.use('/sessions', publicSessionsRouter);
  publicTokenHeaders.use('/bills', publicBillsRouter);
  app.use('/api/public', publicTokenHeaders);

  // Admin routes (auth required).
  const admin = express.Router();
  admin.use(requireAuth);
  admin.use('/settings', adminSettingsRouter);
  admin.use('/members', adminMembersRouter);
  admin.use('/sessions', adminSessionsRouter);
  admin.use('/participants', adminParticipantsRouter);
  admin.use('/cost-items', adminCostItemsRouter);
  admin.use('/split', adminSplitRouter);
  admin.use('/payments', adminPaymentsRouter);
  admin.use('/debts', adminDebtsRouter);
  admin.use('/backup', adminBackupRouter);
  admin.use('/reports', adminReportsRouter);
  app.use('/api/admin', admin);

  // Serve client build + SPA fallback.
  const clientDir = join(dirname(fileURLToPath(import.meta.url)), '../../dist/client');
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(clientDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
