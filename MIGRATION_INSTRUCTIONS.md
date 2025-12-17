# Safe Migration Instructions: Preserve Data

## ⚠️ IMPORTANT: Answer "NO" to the Prisma prompt

When Prisma asks if you want to proceed with data loss, answer **NO**.

## Step-by-Step Migration Process

### Step 1: Cancel Current Migration
- Answer **NO** when Prisma asks about data loss
- This prevents losing your existing data

### Step 2: Run Safe Migration SQL

Connect to your database and run the SQL from:
`prisma/migrations/safe_migrate_location_to_object.sql`

**Or run it via Prisma Studio or your database client:**

```sql
-- Copy data from old columns to new columns
UPDATE "Shift" 
SET "objectId" = "locationId" 
WHERE "locationId" IS NOT NULL AND ("objectId" IS NULL OR "objectId" = '');

UPDATE "Shift" 
SET "objectLabel" = "locationLabel" 
WHERE "locationLabel" IS NOT NULL AND ("objectLabel" IS NULL OR "objectLabel" = '');

-- Handle junction table (if needed)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_EmployeePreferredLocations') THEN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '_EmployeePreferredObjects') THEN
            ALTER TABLE "_EmployeePreferredLocations" RENAME TO "_EmployeePreferredObjects";
        ELSE
            INSERT INTO "_EmployeePreferredObjects" ("A", "B")
            SELECT "A", "B" FROM "_EmployeePreferredLocations"
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
```

### Step 3: Verify Data Was Copied

Run these queries to verify:

```sql
-- Check how many shifts have objectId
SELECT COUNT(*) as shifts_with_objectId FROM "Shift" WHERE "objectId" IS NOT NULL;

-- Check how many shifts still have locationId
SELECT COUNT(*) as shifts_with_locationId FROM "Shift" WHERE "locationId" IS NOT NULL;

-- They should match (or objectId should have more if some were already migrated)
```

### Step 4: Mark Migration as Applied

After verifying data is copied, you can either:

**Option A: Use Prisma DB Push (Recommended)**
```bash
npx prisma db push --accept-data-loss
```
This will sync the schema and drop the old columns (data is already copied, so it's safe).

**Option B: Manually Drop Old Columns (After Verification)**
```sql
-- Only run this AFTER verifying data is in objectId/objectLabel
ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationLabel";
DROP TABLE IF EXISTS "_EmployeePreferredLocations";
```

### Step 5: Regenerate Prisma Client

```bash
npx prisma generate
```

## Quick Command Summary

1. **Answer NO** to Prisma prompt
2. **Run the safe migration SQL** (copy data)
3. **Verify data** (run verification queries)
4. **Run `npx prisma db push --accept-data-loss`** (or manually drop columns)
5. **Run `npx prisma generate`**

## Why This Approach?

- ✅ **Preserves all existing data**
- ✅ **Zero downtime**
- ✅ **Rollback capability** (old columns remain until you drop them)
- ✅ **Safe verification** before dropping old columns

