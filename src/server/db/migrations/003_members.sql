-- Phase 3: members table.
CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  member_type TEXT NOT NULL DEFAULT 'fixed' CHECK (member_type IN ('fixed', 'guest')),
  skill_level INTEGER NOT NULL DEFAULT 0 CHECK (skill_level >= 0 AND skill_level <= 5),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
