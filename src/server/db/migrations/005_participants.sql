-- Phase 5: session_participants — snapshot + payment fields (used P6-P9).
CREATE TABLE session_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  skill_level INTEGER,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('pending','going','attended','absent','cancelled','rejected')),
  should_charge INTEGER NOT NULL DEFAULT 0 CHECK (should_charge IN (0,1)),
  note TEXT,
  calculated_amount INTEGER NOT NULL DEFAULT 0,
  final_amount INTEGER NOT NULL DEFAULT 0,
  previous_final_amount INTEGER,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','partial','paid','waived','needs_review')),
  paid_amount INTEGER NOT NULL DEFAULT 0,
  payment_note TEXT,
  bill_token TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
