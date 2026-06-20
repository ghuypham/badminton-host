-- Phase 7: proxy registration — add paid_by to session_participants.
-- NULL = participant pays themselves (default; all existing rows unaffected).
-- paid_by → the participant who registered and will pay for this follower.
-- FK deferred: same table self-reference, safe with forward-only migration.
ALTER TABLE session_participants
  ADD COLUMN paid_by INTEGER REFERENCES session_participants(id);
