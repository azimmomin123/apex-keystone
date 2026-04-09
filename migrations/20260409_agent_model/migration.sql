-- Create Agent table
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT NOT NULL DEFAULT '',
    "area" TEXT NOT NULL DEFAULT '',
    "telegramId" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "user" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Agent_email_key" ON "Agent"("email");
CREATE INDEX IF NOT EXISTS "Agent_user_idx" ON "Agent"("user");

-- Update Lead.assignedTo to reference Agent instead of User
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_assignedTo_fkey";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedTo_fkey"
    FOREIGN KEY ("assignedTo") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
