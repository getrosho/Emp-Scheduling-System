-- Migration: Rename locationId/locationLabel to objectId/objectLabel
-- This migration safely adds new columns, copies data, and updates foreign keys
-- WITHOUT dropping old columns (for safety and rollback capability)

-- Step 1: Add new columns (nullable initially)
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "objectId" TEXT;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "objectLabel" TEXT;

-- Step 2: Copy existing data from old columns to new columns
UPDATE "Shift" 
SET "objectId" = "locationId" 
WHERE "locationId" IS NOT NULL AND "objectId" IS NULL;

UPDATE "Shift" 
SET "objectLabel" = "locationLabel" 
WHERE "locationLabel" IS NOT NULL AND "objectLabel" IS NULL;

-- Step 3: Add foreign key constraint for objectId
-- First, drop the old foreign key constraint if it exists
ALTER TABLE "Shift" DROP CONSTRAINT IF EXISTS "Shift_locationId_fkey";

-- Add new foreign key constraint for objectId
ALTER TABLE "Shift" 
ADD CONSTRAINT "Shift_objectId_fkey" 
FOREIGN KEY ("objectId") 
REFERENCES "WorkLocation"("id") 
ON DELETE SET NULL;

-- Step 4: Create index on objectId for performance
CREATE INDEX IF NOT EXISTS "Shift_objectId_idx" ON "Shift"("objectId");

-- Step 5: Update the junction table relation name
-- The relation name "EmployeePreferredLocations" needs to be updated to "EmployeePreferredObjects"
-- However, Prisma manages this automatically via the schema, so we just need to ensure
-- the junction table exists and has the correct structure
-- The table name itself doesn't change, only the Prisma relation name

-- Note: The old columns (locationId, locationLabel) are kept for now
-- They can be dropped in a future migration after verification:
-- ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationId";
-- ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationLabel";

-- Verification queries (run these to check migration success):
-- SELECT COUNT(*) FROM "Shift" WHERE "objectId" IS NOT NULL;
-- SELECT COUNT(*) FROM "Shift" WHERE "locationId" IS NOT NULL;
-- SELECT COUNT(*) FROM "Shift" WHERE "objectId" != "locationId" OR ("objectId" IS NULL AND "locationId" IS NOT NULL);

