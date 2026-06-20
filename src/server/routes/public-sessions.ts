// Public session routes: GET /:token (no private_note) + POST /:token/register.
// Rate-limited per IP+token, honeypot, max-pending cap 50.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, badRequest, notFound } from '../utils/http-error.ts';
import { publicRegisterSchema } from '../schemas/participant-schema.ts';
import { getSessionByToken } from '../services/session-service.ts';
import { addGuestParticipant, addProxyGroup } from '../services/participant-service.ts';
import { getDb } from '../db/connection.ts';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize.ts';

export const publicSessionsRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,
  keyGenerator: (req) => `${req.ip}:${req.params.token ?? ''}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Đăng ký quá nhiều lần, thử lại sau ít phút' },
});

// GET /api/public/sessions/:token — public session info, no private_note
publicSessionsRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw notFound();

    let session;
    try {
      session = getSessionByToken(token);
    } catch {
      throw notFound(); // uniform 404 regardless of reason
    }

    const db = getDb();
    const courts = db
      .prepare(
        'SELECT id, name, start_time, end_time, cost FROM session_courts WHERE session_id = ? AND deleted_at IS NULL ORDER BY id ASC',
      )
      .all(session.id);

    // Strip private_note before returning
    const { private_note: _pn, ...publicSession } = session;

    res.json({ session: publicSession, courts });
  }),
);

// POST /api/public/sessions/:token/register
publicSessionsRouter.post(
  '/:token/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw notFound();

    let session;
    try {
      session = getSessionByToken(token);
    } catch {
      throw notFound();
    }

    if (!session.registration_enabled) {
      throw badRequest('Đăng ký đã đóng');
    }

    // Honeypot: silently drop if website field is filled
    const rawBody = req.body as Record<string, unknown>;
    if (rawBody.website && String(rawBody.website).length > 0) {
      // Bot detected — return 200 to not alert bots
      return res.json({ ok: true });
    }

    const input = publicRegisterSchema.parse(rawBody);

    const companions = input.companions ?? [];

    // Max pending cap: 50 (count registrant + companions together)
    const db = getDb();
    const pendingCount = (
      db
        .prepare(
          `SELECT COUNT(*) as cnt FROM session_participants
           WHERE session_id = ? AND status = 'pending' AND deleted_at IS NULL`,
        )
        .get(session.id) as { cnt: number }
    ).cnt;

    // 1 primary + N companions
    const totalAdding = 1 + companions.length;
    if (pendingCount + totalAdding > 50) {
      return res.status(429).json({
        error: 'too_many_pending',
        message: 'Quá nhiều người đang chờ duyệt, thử lại sau',
      });
    }

    if (companions.length === 0) {
      // Simple single registration (no proxy group)
      const participant = await addGuestParticipant(session.id, {
        name: sanitizeText(input.name),
        phone: sanitizeOptional(input.phone) ?? undefined,
        skill_level: input.skill_level ?? undefined,
        note: sanitizeOptional(input.note) ?? undefined,
        status: 'pending',
      });
      return res.status(201).json({
        ok: true,
        id: participant.id,
        name: participant.name,
        status: participant.status,
      });
    }

    // Proxy group registration: A + companions in a single transaction
    const { primary } = addProxyGroup(
      session.id,
      {
        name: sanitizeText(input.name),
        phone: sanitizeOptional(input.phone) ?? undefined,
        skill_level: input.skill_level ?? undefined,
        note: sanitizeOptional(input.note) ?? undefined,
        status: 'pending',
      },
      companions,
    );

    return res.status(201).json({
      ok: true,
      id: primary.id,
      name: primary.name,
      status: primary.status,
      companions_count: companions.length,
    });
  }),
);
