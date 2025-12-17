# Migration Guide: Locations → Objects

## Database Migration Required

The Prisma schema has been updated to rename:
- `Shift.locationId` → `Shift.objectId`
- `Shift.locationLabel` → `Shift.objectLabel`
- `Shift.location` relation → `Shift.object`
- `Employee.preferredLocations` relation → `Employee.preferredObjects`
- `WorkLocation.employeesPreferred` relation name → `EmployeePreferredObjects`

## Migration Steps

### Step 1: Create Migration File

Since the database may already have data, we need a safe migration:

```bash
# Navigate to project root
cd "C:\Users\Getro\OneDrive\Desktop\Emp Scheduling System"

# Create migration (this will generate SQL)
npx prisma migrate dev --name rename_location_to_object --create-only
```

### Step 2: Edit Migration SQL

The generated migration will need manual editing to:
1. Add new `objectId` column (nullable initially)
2. Copy data from `locationId` to `objectId`
3. Add new `objectLabel` column (nullable initially)
4. Copy data from `locationLabel` to `objectLabel`
5. Drop old columns after verification

### Step 3: Manual SQL Migration (if needed)

If Prisma migration doesn't work, run this SQL directly:

```sql
-- Add new columns
ALTER TABLE "Shift" ADD COLUMN "objectId" TEXT;
ALTER TABLE "Shift" ADD COLUMN "objectLabel" TEXT;

-- Copy data
UPDATE "Shift" SET "objectId" = "locationId" WHERE "locationId" IS NOT NULL;
UPDATE "Shift" SET "objectLabel" = "locationLabel" WHERE "locationLabel" IS NOT NULL;

-- Update foreign key constraint (drop old, add new)
ALTER TABLE "Shift" DROP CONSTRAINT IF EXISTS "Shift_locationId_fkey";
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_objectId_fkey" 
  FOREIGN KEY ("objectId") REFERENCES "WorkLocation"("id") ON DELETE SET NULL;

-- Drop old columns (after verification)
-- ALTER TABLE "Shift" DROP COLUMN "locationId";
-- ALTER TABLE "Shift" DROP COLUMN "locationLabel";

-- Update relation name in junction table (if exists)
-- The relation name change doesn't affect the database structure,
-- only the Prisma relation name
```

### Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 5: Verify

1. Check that all shifts have `objectId` populated
2. Verify API endpoints work with new field names
3. Test Month Overview loads correctly
4. Test shift creation/edit forms

## Files Changed

### Prisma Schema
- `prisma/schema.prisma` - Updated model fields and relations

### API Routes
- `src/app/api/shifts/route.ts` - Updated to use `objectId`
- `src/app/api/shifts/[id]/route.ts` - Updated to use `objectId`
- `src/app/api/employees/route.ts` - Updated to use `preferredObjectIds`
- `src/app/api/employees/[id]/route.ts` - Updated to use `preferredObjectIds`
- `src/app/api/month-status/route.ts` - Updated to use `objectId`

### Validations
- `src/lib/validations/employees.ts` - `preferredLocationIds` → `preferredObjectIds`, `locationId` → `objectId`
- `src/lib/validations/shifts.ts` - `locationId` → `objectId`, `locationLabel` → `objectLabel`

### Hooks
- `src/hooks/use-employees.ts` - Updated types and filters
- `src/hooks/use-shifts.ts` - Updated types

### Components & Pages
- `src/components/employees/employee-edit-form.tsx` - Uses `ObjectSelector`
- `src/app/(dashboard)/employees/create/page.tsx` - Uses `useObjects`
- `src/app/(dashboard)/employees/[id]/edit/page.tsx` - Uses `preferredObjectIds`
- `src/app/(dashboard)/employees/[id]/page.tsx` - Displays `preferredObjects`
- `src/app/(dashboard)/shifts/create/page.tsx` - Uses `objectId`
- `src/app/(dashboard)/shifts/[id]/page.tsx` - Uses `objectId`
- `src/app/(dashboard)/shifts/page.tsx` - Uses `objectLabel`
- `src/app/(dashboard)/dashboard/page.tsx` - Uses `objectId`

### Types
- `src/types/employees.ts` - `preferredLocations` → `preferredObjects`

## Notes

- The `WorkLocation` model name is kept (it's the database table name)
- Only the relation names and field references changed
- Address fields (address, city, state, postalCode) remain unchanged as they refer to physical addresses

