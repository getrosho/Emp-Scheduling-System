# Step 1 Completion Report: Locations → Objects Rename

## Status: ✅ COMPLETED (with migration required)

## Summary

All code references to "Locations" have been renamed to "Objects" throughout the codebase, except for physical address fields (address, city, state, postalCode) which correctly remain as location-related.

## Files Updated

### Prisma Schema
- ✅ `prisma/schema.prisma`
  - `Shift.locationId` → `Shift.objectId`
  - `Shift.locationLabel` → `Shift.objectLabel`
  - `Shift.location` relation → `Shift.object`
  - `Employee.preferredLocations` → `Employee.preferredObjects`
  - Relation name: `EmployeePreferredLocations` → `EmployeePreferredObjects`

### API Routes
- ✅ `src/app/api/shifts/route.ts` - Updated filters and create logic
- ✅ `src/app/api/shifts/[id]/route.ts` - Updated includes
- ✅ `src/app/api/employees/route.ts` - Updated filters and create logic
- ✅ `src/app/api/employees/[id]/route.ts` - Updated update logic
- ✅ `src/app/api/month-status/route.ts` - Updated shift mapping
- ✅ `src/app/api/dashboard/route.ts` - `totalLocations` → `totalObjects`
- ✅ `src/app/api/objects/route.ts` - Created (new)
- ✅ `src/app/api/objects/[id]/route.ts` - Created (new)

### Validations
- ✅ `src/lib/validations/employees.ts`
  - `preferredLocationIds` → `preferredObjectIds`
  - `locationId` filter → `objectId` filter
  - `assignPreferredLocationsSchema` → `assignPreferredObjectsSchema`
- ✅ `src/lib/validations/shifts.ts`
  - `locationId` → `objectId`
  - `locationLabel` → `objectLabel`
- ✅ `src/lib/validations/objects.ts` - Created (new)
- ✅ `src/lib/validations/index.ts` - Updated exports

### Hooks
- ✅ `src/hooks/use-employees.ts`
  - `preferredLocationIds` → `preferredObjectIds`
  - `locationId` filter → `objectId` filter
- ✅ `src/hooks/use-shifts.ts`
  - `locationId` → `objectId`
  - `locationLabel` → `objectLabel`
  - `location` → `object`
- ✅ `src/hooks/use-objects.ts` - Created (new)
- ✅ `src/hooks/use-dashboard.ts` - `totalLocations` → `totalObjects`

### Types
- ✅ `src/types/employees.ts`
  - `preferredLocations` → `preferredObjects`

### Components
- ✅ `src/components/employees/employee-edit-form.tsx`
  - Uses `ObjectSelector` instead of `LocationSelector`
  - `allowedLocationIds` → `allowedObjectIds`
  - `preferredLocationIds` → `preferredObjectIds`
- ✅ `src/components/employees/object-selector.tsx` - Created (new)
- ⚠️ `src/components/employees/location-selector.tsx` - Still exists (legacy, can be removed)

### Pages
- ✅ `src/app/(dashboard)/employees/create/page.tsx`
- ✅ `src/app/(dashboard)/employees/[id]/edit/page.tsx`
- ✅ `src/app/(dashboard)/employees/[id]/page.tsx`
- ✅ `src/app/(dashboard)/shifts/create/page.tsx`
- ✅ `src/app/(dashboard)/shifts/[id]/page.tsx`
- ✅ `src/app/(dashboard)/shifts/page.tsx`
- ✅ `src/app/(dashboard)/dashboard/page.tsx`
- ✅ `src/app/(dashboard)/objects/page.tsx` - Created (new)
- ✅ `src/app/(dashboard)/objects/create/page.tsx` - Created (new)
- ⚠️ `src/app/(dashboard)/locations/*` - Old routes still exist (can be removed or kept for backward compatibility)

### Navigation
- ✅ `src/components/common/sidebar-nav.tsx` - Updated to show "Objects" instead of "Locations"

## Database Migration Required

⚠️ **CRITICAL**: The database schema needs to be migrated before the application will work correctly.

### Migration Steps:

1. **Generate Prisma Client** (already done in code):
   ```bash
   npm run prisma:generate
   ```

2. **Create Migration**:
   ```bash
   npx prisma migrate dev --name rename_location_to_object --create-only
   ```

3. **Edit the generated migration SQL** to safely migrate data:
   ```sql
   -- Add new columns
   ALTER TABLE "Shift" ADD COLUMN "objectId" TEXT;
   ALTER TABLE "Shift" ADD COLUMN "objectLabel" TEXT;

   -- Copy existing data
   UPDATE "Shift" SET "objectId" = "locationId" WHERE "locationId" IS NOT NULL;
   UPDATE "Shift" SET "objectLabel" = "locationLabel" WHERE "locationLabel" IS NOT NULL;

   -- Update foreign key
   ALTER TABLE "Shift" DROP CONSTRAINT IF EXISTS "Shift_locationId_fkey";
   ALTER TABLE "Shift" ADD CONSTRAINT "Shift_objectId_fkey" 
     FOREIGN KEY ("objectId") REFERENCES "WorkLocation"("id") ON DELETE SET NULL;

   -- After verification, drop old columns:
   -- ALTER TABLE "Shift" DROP COLUMN "locationId";
   -- ALTER TABLE "Shift" DROP COLUMN "locationLabel";
   ```

4. **Apply Migration**:
   ```bash
   npx prisma migrate dev
   ```

5. **Regenerate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

## Remaining Legacy Files (Can be removed)

These files still exist but are no longer used:
- `src/app/(dashboard)/locations/*` - Old location pages
- `src/app/api/locations/*` - Old location API routes
- `src/hooks/use-locations.ts` - Old hook
- `src/components/employees/location-selector.tsx` - Old component
- `src/lib/validations/locations.ts` - Old validations

**Recommendation**: Keep them temporarily for backward compatibility, then remove after migration is verified.

## Verification Checklist

- [x] Prisma schema updated
- [x] All API routes updated
- [x] All validations updated
- [x] All hooks updated
- [x] All types updated
- [x] All components updated
- [x] All pages updated
- [x] Navigation updated
- [ ] **Database migration applied** ⚠️ REQUIRED
- [ ] **Prisma client regenerated** ⚠️ REQUIRED
- [ ] TypeScript compilation passes
- [ ] Dev server starts without errors
- [ ] API endpoints tested

## Next Steps

1. **Apply database migration** (see above)
2. **Regenerate Prisma client**: `npm run prisma:generate`
3. **Test compilation**: TypeScript should compile without errors
4. **Start dev server**: `npm run dev`
5. **Verify**: Check that `/objects` route works and Month Overview displays correctly

## Notes

- The `WorkLocation` model name is intentionally kept (it's the database table name)
- Only relation names and field references changed
- Physical address fields remain unchanged (address, city, state, postalCode)
- Old `/locations` routes can be kept for backward compatibility or removed

