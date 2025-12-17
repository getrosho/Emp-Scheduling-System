# Safe Database Schema Sync - Preserve Data

## ⚠️ DO NOT USE `prisma migrate reset` - It will DELETE all your data!

## Recommended Approach: Use `prisma db push`

For a development database with existing data, use `db push` which syncs the schema without requiring migrations:

```bash
npx prisma db push
```

This will:
- ✅ Add missing tables and columns
- ✅ Add missing indexes and foreign keys
- ✅ **Preserve all existing data**
- ✅ Sync schema without creating migration files

## Alternative: If you want to use Migrations

If you want to use Prisma Migrate going forward, you need to baseline the existing database:

### Step 1: Mark current state as baseline

```bash
# This creates an empty migration that marks current state as baseline
npx prisma migrate dev --name init --create-only
```

### Step 2: Edit the migration file

The generated migration will be empty (or minimal). You need to:
1. Open the generated migration file in `prisma/migrations/`
2. Make it an empty migration (just a comment)
3. This tells Prisma "the database is already in this state"

### Step 3: Mark as applied

```bash
# Mark the baseline migration as applied without running it
npx prisma migrate resolve --applied <migration_name>
```

### Step 4: Create future migrations

After baselining, future schema changes will create proper migrations.

## Quick Decision Guide

- **Development/Testing**: Use `npx prisma db push` ✅ (Recommended for you)
- **Production/Team**: Use migrations with baseline approach

## For Your Current Situation

Since you have existing data and this is development:

```bash
# This is the SAFEST option - preserves all data
npx prisma db push
```

Then regenerate the Prisma client:

```bash
npx prisma generate
```

## What `db push` Will Do

Based on the drift detected, it will:
- Add missing enums (AssignmentStatus, DayOfWeek, etc.)
- Add missing tables (if any)
- Add missing indexes and foreign keys
- **NOT delete any existing data**
- **NOT drop existing columns** (unless they're removed from schema)

## After `db push`

1. Your existing data will be preserved
2. Schema will be in sync
3. You can continue development
4. Future changes can use `db push` or switch to migrations

