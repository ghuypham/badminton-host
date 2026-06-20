// Public report route: GET /api/public/report/:token
// Returns participation stats (session counts) only — NO money, NO phone.
// 404 is uniform regardless of reason (token invalid or report disabled) to prevent info leak.
// show_guests toggle is enforced server-side: guests are omitted from payload when disabled.
import { Router } from 'express';
import { asyncHandler, notFound } from '../utils/http-error.ts';
import { getSettings } from '../services/settings-service.ts';
import { getPublicParticipationReport } from '../services/reports-service.ts';

export const publicReportRouter = Router();

publicReportRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw notFound();

    const settings = getSettings();

    // Uniform 404: disabled OR token mismatch — no information leak
    if (
      !settings.public_report_enabled ||
      !settings.public_report_token ||
      settings.public_report_token !== token
    ) {
      throw notFound();
    }

    const showGuests = settings.public_report_show_guests === 1;
    const report = getPublicParticipationReport(showGuests);

    res.json({
      club: { name: settings.club_name },
      ...report,
    });
  }),
);
