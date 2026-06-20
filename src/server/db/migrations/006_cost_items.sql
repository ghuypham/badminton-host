-- Phase 6: cost_items per session (discount can be negative amount).
CREATE TABLE cost_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shuttle','water','extra','discount')),
  label TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
