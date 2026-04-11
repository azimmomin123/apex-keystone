-- Drop the telegramId column from User. The field has been removed from the
-- Keystone User model because users don't have a meaningful use for a
-- personal Telegram identifier — Telegram notifications are targeted at
-- Agents, which keep their own telegramId column untouched.
ALTER TABLE "User" DROP COLUMN IF EXISTS "telegramId";
