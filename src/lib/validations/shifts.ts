import { z } from "zod";
import { RecurringRule, ShiftStatus } from "@/generated/prisma/enums";

export const shiftFilterSchema = z.object({
  status: z.nativeEnum(ShiftStatus).optional(),
  locationId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createShiftSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  date: z.coerce.date(),
  locationLabel: z.string().optional(),
  locationId: z.string().cuid().optional(),
  skillsRequired: z.array(z.string()).optional(),
  assignedEmployeeIds: z
    .array(z.string())
    .default([])
    .transform((arr) => arr.filter((id) => id && id.trim().length > 0))
    .pipe(z.array(z.string().cuid())),
  isRecurring: z.boolean().default(false),
  recurringRule: z.nativeEnum(RecurringRule).default(RecurringRule.NONE),
  colorTag: z.string().optional(),
});

export const updateShiftSchema = createShiftSchema.partial().extend({
  status: z.nativeEnum(ShiftStatus).optional(),
});

