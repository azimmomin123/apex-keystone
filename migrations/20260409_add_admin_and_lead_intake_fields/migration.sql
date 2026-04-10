-- Add admin-related fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Add Gmail lead-intake fields to Lead
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "propertyInterest" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "followUpDate" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "emailThreadId" TEXT;

-- Drop any auto-generated plain unique index/constraint on emailThreadId
-- (safety: covers the case where Keystone had previously emitted one).
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_emailThreadId_key";
DROP INDEX IF EXISTS "Lead_emailThreadId_key";

-- Partial unique index: allows multiple NULLs (manual leads) while still
-- guaranteeing the Gmail cron can dedup by thread ID.
CREATE UNIQUE INDEX "Lead_emailThreadId_key" ON "Lead"("emailThreadId") WHERE "emailThreadId" IS NOT NULL;

-- Data fix: make the first existing user an admin so we don't lock ourselves
-- out of the new admin section after the invite-only change.
UPDATE "User" SET "isAdmin" = true WHERE "id" = (SELECT "id" FROM "User" ORDER BY "id" ASC LIMIT 1);
