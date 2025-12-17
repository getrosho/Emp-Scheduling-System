# Database Migration Execution Guide

## Quick Start

### Step 1: Connect to Database

Ensure your `DATABASE_URL` environment variable is set correctly.

### Step 2: Execute Migration SQL

**Option A: Using psql (PostgreSQL CLI)**
```bash
psql $DATABASE_URL -f prisma/migrations/manual_rename_location_to_object.sql
```

**Option B: Using Database Client (pgAdmin, DBeaver, etc.)**
1. Connect to your database
2. Open SQL editor
3. Copy and paste contents of `prisma/migrations/manual_rename_location_to_object.sql`
4. Execute

**Option C: Using Prisma Migrate (if database is accessible)**
```bash
npx prisma migrate dev --name rename_location_to_object
# Then manually edit the generated SQL file to match our safe migration
npx prisma migrate deploy
```

### Step 3: Verify Migration

Run these SQL queries to verify:

```sql
-- Check data was copied
SELECT 
  COUNT(*) as total_shifts,
  COUNT("locationId") as has_location_id,
  COUNT("objectId") as has_object_id,
  COUNT(CASE WHEN "objectId" = "locationId" THEN 1 END) as matching_ids
FROM "Shift";

-- Check foreign key exists
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conname = 'Shift_objectId_fkey';

-- Check index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'Shift' AND indexname = 'Shift_objectId_idx';
```

### Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 5: Test Application

```bash
npm run dev
```

Then verify:
- `/objects` page loads
- `/dashboard` (Month Overview) displays correctly
- Creating/editing shifts works
- Creating/editing employees with preferred objects works

---

## Migration SQL (Complete)

```sql
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

-- Verification queries (run these to check migration success):
-- SELECT COUNT(*) FROM "Shift" WHERE "objectId" IS NOT NULL;
-- SELECT COUNT(*) FROM "Shift" WHERE "locationId" IS NOT NULL;
-- SELECT COUNT(*) FROM "Shift" WHERE "objectId" != "locationId" OR ("objectId" IS NULL AND "locationId" IS NOT NULL);
```

---

## Rollback Plan (if needed)

If you need to rollback the migration:

```sql
-- Remove new columns (only if migration failed)
ALTER TABLE "Shift" DROP COLUMN IF EXISTS "objectId";
ALTER TABLE "Shift" DROP COLUMN IF EXISTS "objectLabel";

-- Restore old foreign key
ALTER TABLE "Shift" 
ADD CONSTRAINT "Shift_locationId_fkey" 
FOREIGN KEY ("locationId") 
REFERENCES "WorkLocation"("id") 
ON DELETE SET NULL;

-- Drop new index
DROP INDEX IF EXISTS "Shift_objectId_idx";
```

---

## Troubleshooting

### Error: "column already exists"
- The migration uses `IF NOT EXISTS`, so this shouldn't happen
- If it does, the column was already added - skip that step

### Error: "constraint already exists"
- The migration drops the old constraint first
- If you see this, the constraint was already updated - skip that step

### Error: "foreign key violation"
- This means some `locationId` values don't exist in `WorkLocation` table
- Check: `SELECT DISTINCT "locationId" FROM "Shift" WHERE "locationId" NOT IN (SELECT id FROM "WorkLocation");`
- Fix orphaned references before running migration

### Data not copied
- Check: `SELECT COUNT(*) FROM "Shift" WHERE "objectId" IS NULL AND "locationId" IS NOT NULL;`
- If count > 0, run the UPDATE statements again

---

## Post-Migration Checklist

- [ ] Migration SQL executed successfully
- [ ] Verification queries show data was copied
- [ ] Foreign key constraint exists
- [ ] Index created
- [ ] Prisma client regenerated
- [ ] Application starts without errors
- [ ] `/objects` page works
- [ ] `/dashboard` (Month Overview) displays correctly
- [ ] Creating shifts with objects works
- [ ] Creating employees with preferred objects works
- [ ] TypeScript compilation passes (after clearing .next cache)

---

## Next Steps After Migration

1. **Test thoroughly** for a few days
2. **Monitor** for any issues
3. **After verification**, you can drop old columns:
   ```sql
   ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationId";
   ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationLabel";
   ```

---

**Status**: Ready to execute! 🚀

