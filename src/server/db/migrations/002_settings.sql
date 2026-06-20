-- Phase 2: settings single-row (id='default') + seed.
CREATE TABLE settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  club_name TEXT NOT NULL DEFAULT 'CLB Cầu lông',
  host_name TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  payment_note_template TEXT NOT NULL DEFAULT 'Cau long {date} {name}',
  default_rounding INTEGER NOT NULL DEFAULT 1000,
  bank_qr_image_base64 TEXT,
  bank_qr_mime TEXT,
  bank_qr_updated_at TEXT,
  updated_at TEXT NOT NULL
);

INSERT INTO settings (id, updated_at) VALUES ('default', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
