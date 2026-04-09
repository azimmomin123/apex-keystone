-- Drop old todo tables
DROP TABLE IF EXISTS "_TodoImage_image" CASCADE;
DROP TABLE IF EXISTS "TodoImage" CASCADE;
DROP TABLE IF EXISTS "Todo" CASCADE;

-- Remove old role columns, add new ones
ALTER TABLE "Role" DROP COLUMN IF EXISTS "canCreateTodos";
ALTER TABLE "Role" DROP COLUMN IF EXISTS "canManageAllTodos";
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "canManageLeads" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS "canManageAllLeads" BOOLEAN NOT NULL DEFAULT false;

-- Remove tasks from User, add phone
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';

-- Create Property table (before Lead since Lead references Property)
CREATE TABLE IF NOT EXISTS "Property" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "type" TEXT DEFAULT 'single_family',
    "status" TEXT DEFAULT 'active',
    "price" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "sqft" INTEGER,
    "yearBuilt" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "mlsNumber" TEXT NOT NULL DEFAULT '',
    "agent" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- Create Lead table
CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "stage" TEXT DEFAULT 'new',
    "source" TEXT DEFAULT 'manual',
    "priority" TEXT DEFAULT 'medium',
    "budget" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "property" TEXT REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- Create Activity table
CREATE TABLE IF NOT EXISTS "Activity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "lead" TEXT REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "performedBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Lead_assignedTo_idx" ON "Lead"("assignedTo");
CREATE INDEX IF NOT EXISTS "Lead_property_idx" ON "Lead"("property");
CREATE INDEX IF NOT EXISTS "Activity_lead_idx" ON "Activity"("lead");
CREATE INDEX IF NOT EXISTS "Activity_performedBy_idx" ON "Activity"("performedBy");
CREATE INDEX IF NOT EXISTS "Property_agent_idx" ON "Property"("agent");
