import { z } from "zod";

// Date-based availability schema (for specific dates)
export const dateAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  isAvailable: z.boolean(),
});

// Bulk date availability update schema
export const bulkDateAvailabilitySchema = z.object({
  employeeId: z.string().cuid(),
  availabilities: z.array(dateAvailabilitySchema).min(1),
});

// Get availability by date range
export const availabilityDateRangeSchema = z.object({
  employeeId: z.string().cuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format").optional(),
});

