# Database Migration: Locations → Objects (Step 1 Finalization)

## Migration Strategy: Safe Data Preservation

This migration adds new columns, copies data, and updates foreign keys **without dropping old columns** to ensure zero data loss and easy rollback.

## Migration SQL File

The migration SQL has been created at:
`prisma/migrations/manual_rename_location_to_object.sql`

### Migration Steps:

1. **Add New Columns** (nullable initially)
   ```sql
   ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "objectId" TEXT;
   ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "objectLabel" TEXT;
   ```

2. **Copy Existing Data**
   ```sql
   UPDATE "Shift" 
   SET "objectId" = "locationId" 
   WHERE "locationId" IS NOT NULL AND "objectId" IS NULL;

   UPDATE "Shift" 
   SET "objectLabel" = "locationLabel" 
   WHERE "locationLabel" IS NOT NULL AND "objectLabel" IS NULL;
   ```

3. **Update Foreign Key**
   ```sql
   ALTER TABLE "Shift" DROP CONSTRAINT IF EXISTS "Shift_locationId_fkey";
   ALTER TABLE "Shift" 
   ADD CONSTRAINT "Shift_objectId_fkey" 
   FOREIGN KEY ("objectId") 
   REFERENCES "WorkLocation"("id") 
   ON DELETE SET NULL;
   ```

4. **Add Index for Performance**
   ```sql
   CREATE INDEX IF NOT EXISTS "Shift_objectId_idx" ON "Shift"("objectId");
   ```

## How to Apply Migration

### Option 1: Using Prisma Migrate (Recommended)

```bash
cd "C:\Users\Getro\OneDrive\Desktop\Emp Scheduling System"

# Create migration
npx prisma migrate dev --name rename_location_to_object

# If Prisma generates the migration, edit the SQL file to match the safe migration above
# Then apply it:
npx prisma migrate deploy
```

### Option 2: Manual SQL Execution

1. Connect to your PostgreSQL database
2. Run the SQL from `prisma/migrations/manual_rename_location_to_object.sql`
3. Verify data was copied correctly:
   ```sql
   SELECT COUNT(*) FROM "Shift" WHERE "objectId" IS NOT NULL;
   SELECT COUNT(*) FROM "Shift" WHERE "locationId" IS NOT NULL;
   ```

### Option 3: Using Database Client (pgAdmin, DBeaver, etc.)

1. Open your database client
2. Connect to the database
3. Execute the SQL from `prisma/migrations/manual_rename_location_to_object.sql`
4. Verify the migration succeeded

## After Migration

1. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Verify Prisma Client**:
   - Check that `src/generated/prisma/models/Shift.ts` has `objectId` and `objectLabel`
   - Check that `src/generated/prisma/models/Employee.ts` has `preferredObjects` relation

3. **Test Application**:
   ```bash
   npm run dev
   ```

4. **Verify Endpoints**:
   - GET `/api/objects` - Should return objects list
   - GET `/api/shifts` - Should use `objectId` in queries
   - GET `/api/employees` - Should use `preferredObjects` relation
   - GET `/api/month-status?month=2025-01` - Should work with new fields
   - GET `/api/dashboard` - Should return `totalObjects`

## Verification Queries

Run these SQL queries to verify migration:

```sql
-- Check that all locationId values were copied to objectId
SELECT 
  COUNT(*) as total_shifts,
  COUNT("locationId") as has_location_id,
  COUNT("objectId") as has_object_id,
  COUNT(CASE WHEN "objectId" = "locationId" THEN 1 END) as matching_ids
FROM "Shift";

-- Check foreign key constraint exists
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conname = 'Shift_objectId_fkey';

-- Check index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Shift' AND indexname = 'Shift_objectId_idx';
```

## Rollback Plan (if needed)

If you need to rollback:

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
```

## Notes

- **Old columns are NOT dropped** - This allows for safe rollback
- **Data is preserved** - All existing `locationId`/`locationLabel` values are copied
- **Foreign key updated** - New constraint uses `objectId`
- **Junction table unchanged** - The `_EmployeePreferredLocations` table structure doesn't change, only the Prisma relation name

## Future Cleanup (After Verification)

Once you've verified everything works for a few days, you can drop the old columns:

```sql
-- DROP OLD COLUMNS (ONLY AFTER VERIFICATION)
ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Shift" DROP COLUMN IF EXISTS "locationLabel";
```

