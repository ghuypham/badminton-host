// Admin routes for public report sharing settings.
// GET  /api/admin/report-share        — current state (enabled, token, show_guests)
// PUT  /api/admin/report-share/enable — toggle enabled (body: { enabled: boolean })
// PUT  /api/admin/report-share/guests — toggle show_guests (body: { show: boolean })
// POST /api/admin/report-share/regenerate — force new token
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import {
  getSettings,
  setPublicReportEnabled,
  setPublicReportShowGuests,
  regeneratePublicReportToken,
} from '../services/settings-service.ts';

export const adminReportShareRouter = Router();

// GET — return only the public-report-relevant fields (not full settings to keep surface minimal)
adminReportShareRouter.get('/', (_req, res) => {
  const s = getSettings();
  res.json({
    enabled: s.public_report_enabled === 1,
    token: s.public_report_token,
    show_guests: s.public_report_show_guests === 1,
  });
});

const enableSchema = z.object({ enabled: z.boolean() });

adminReportShareRouter.put(
  '/enable',
  asyncHandler(async (req, res) => {
    const { enabled } = enableSchema.parse(req.body);
    const s = setPublicReportEnabled(enabled);
    res.json({
      enabled: s.public_report_enabled === 1,
      token: s.public_report_token,
      show_guests: s.public_report_show_guests === 1,
    });
  }),
);

const guestsSchema = z.object({ show: z.boolean() });

adminReportShareRouter.put(
  '/guests',
  asyncHandler(async (req, res) => {
    const { show } = guestsSchema.parse(req.body);
    const s = setPublicReportShowGuests(show);
    res.json({
      enabled: s.public_report_enabled === 1,
      token: s.public_report_token,
      show_guests: s.public_report_show_guests === 1,
    });
  }),
);

adminReportShareRouter.post(
  '/regenerate',
  asyncHandler(async (_req, res) => {
    const s = regeneratePublicReportToken();
    res.json({
      enabled: s.public_report_enabled === 1,
      token: s.public_report_token,
      show_guests: s.public_report_show_guests === 1,
    });
  }),
);
