-- Add the lead type discriminator: 'apex' (shared pool) or 'personal' (private).
-- Existing rows are all backfilled to 'apex' since the feature that lets
-- non-admins create Personal leads ships in the same change set.
ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'apex';

-- Defensive: if any rows somehow ended up with NULL or empty string, normalize
-- them to 'apex' so the Keystone select field never sees an unknown value.
UPDATE "Lead" SET "type" = 'apex' WHERE "type" IS NULL OR "type" = '';
