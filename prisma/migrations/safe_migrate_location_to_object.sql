-- Safe Migration: Preserve data when migrating from locationId/locationLabel to objectId/objectLabel
-- This migration copies data BEFORE dropping old columns

-- Step 1: Ensure new columns exist (they should already exist from schema)
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "objectId" TEXT;
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "objectLabel" TEXT;

-- Step 2: Copy existing data from old columns to new columns (if not already copied)
UPDATE "Shift" 
SET "objectId" = "locationId" 
WHERE "locationId" IS NOT NULL AND ("objectId" IS NULL OR "objectId" = '');

UPDATE "Shift" 
SET "objectLabel" = "locationLabel" 
WHERE "locationLabel" IS NOT NULL AND ("objectLabel" IS NULL OR "objectLabel" = '');

-- Step 3: Verify data was copied (run these queries to check)
-- SELECT COUNT(*) as total_shifts FROM "Shift";
-- SELECT COUNT(*) as shifts_with_objectId FROM "Shift" WHERE "objectId" IS NOT NULL;
-- SELECT COUNT(*) as shifts_with_locationId FROM "Shift" WHERE "locationId" IS NOT NULL;

-- Step 4: Update foreign key constraint (if not already done)
ALTER TABLE "Shift" DROP CONSTRAINT IF EXISTS "Shift_locationId_fkey";
ALTER TABLE "Shift" DROP CONSTRAINT IF EXISTS "Shift_objectId_fkey";

ALTER TABLE "Shift" 
ADD CONSTRAINT "Shift_objectId_fkey" 
FOREIGN KEY ("objectId") 
REFERENCES "WorkLocation"("id") 
ON DELETE SET NULL;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS "Shift_objectId_idx" ON "Shift"("objectId");

-- Step 6: Handle junction table rename (if needed)
-- The table name _EmployeePreferredLocations should be renamed to _EmployeePreferredObjects
-- But Prisma manages this, so we just ensure the table exists with correct structure
-- If the old table exists, we can rename it:
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_EmployeePreferredLocations') THEN
        -- Check if new table doesn't exist yet
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_EmployeePreferredObjects') THEN
            ALTER TABLE "_EmployeePreferredLocations" RENAME TO "_EmployeePreferredObjects";
        ELSE
            -- If both exist, copy data from old to new
            INSERT INTO "_EmployeePreferredObjects" ("A", "B")
            SELECT "A", "B" FROM "_EmployeePreferredLocations"
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- NOTE: Do NOT drop old columns yet - keep them for rollback capability
-- After verifying everything works, you can drop them in a separate migration:
-- ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationId";
-- ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationLabel";
-- DROP TABLE IF EXISTS "_EmployeePreferredLocations";

