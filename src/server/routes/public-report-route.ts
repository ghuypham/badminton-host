// Public report route: GET /api/public/report/:token
// Returns participation stats (session counts) only — NO money, NO phone.
// 404 is uniform regardless of reason (token invalid or report disabled) to prevent info leak.
// show_guests toggle is enforced server-side: guests are omitted from payload when disabled.
// Optional query params: from, to (ISO yyyy-mm-dd) for date range filtering.
// Range params are validated and ONLY applied after token/enabled check — no bypass possible.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../utils/http-error.ts';
import { getSettings } from '../services/settings-service.ts';
import { getPublicParticipationReport } from '../services/reports-service.ts';

export const publicReportRouter = Router();

// ISO date yyyy-mm-dd (optional)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const rangeSchema = z.object({ from: isoDate, to: isoDate });

publicReportRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw notFound();

    const settings = getSettings();

    // Uniform 404: disabled OR token mismatch — no information leak
    // Range params are irrelevant until AFTER this gate.
    if (
      !settings.public_report_enabled ||
      !settings.public_report_token ||
      settings.public_report_token !== token
    ) {
      throw notFound();
    }

    // Validate optional range params (invalid format → treat as absent, don't 400)
    const parsed = rangeSchema.safeParse(req.query);
    const range = parsed.success
      ? { from: parsed.data.from, to: parsed.data.to }
      : undefined;

    const showGuests = settings.public_report_show_guests === 1;
    const report = getPublicParticipationReport(showGuests, range);

    res.json({
      club: { name: settings.club_name },
      ...report,
    });
  }),
);
