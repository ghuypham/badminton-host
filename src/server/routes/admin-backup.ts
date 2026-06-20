// Admin backup routes: GET /export (JSON download) + POST /import.
// Body limit 25MB do global express.json (app.ts) áp dụng → >25MB bị 413 trước khi vào route.
import { Router } from 'express';
import { asyncHandler } from '../utils/http-error.ts';
import { getDb } from '../db/connection.ts';
import { exportData, importData } from '../services/backup-service.ts';

export const adminBackupRouter = Router();

// GET /api/admin/backup/export → badminton-host-backup-YYYY-MM-DD-HHmm.json
adminBackupRouter.get(
  '/export',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `badminton-host-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;

    const data = exportData(getDb(), now.toISOString());
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  }),
);

// POST /api/admin/backup/import
adminBackupRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    await importData(getDb(), req.body);
    res.json({ ok: true });
  }),
);
