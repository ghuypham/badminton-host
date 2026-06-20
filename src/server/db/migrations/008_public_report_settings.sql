-- Phase 8: public report settings — token-based shareable participation report.
-- public_report_enabled: 0=off, 1=on. Link disabled → uniform 404.
-- public_report_token: random ≥128-bit hex, generated on first enable. Stable across toggles.
-- public_report_show_guests: 0=hide guests, 1=show (default). Enforced server-side.
ALTER TABLE settings ADD COLUMN public_report_enabled INTEGER NOT NULL DEFAULT 0 CHECK (public_report_enabled IN (0,1));
ALTER TABLE settings ADD COLUMN public_report_token TEXT;
ALTER TABLE settings ADD COLUMN public_report_show_guests INTEGER NOT NULL DEFAULT 1 CHECK (public_report_show_guests IN (0,1));
