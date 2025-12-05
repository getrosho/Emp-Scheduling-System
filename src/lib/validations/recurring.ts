import { z } from "zod";
import { DayOfWeek, RecurringRule } from "@/generated/prisma/enums";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createRecurringSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  rule: z.nativeEnum(RecurringRule).refine((rule) => rule !== RecurringRule.NONE, {
    message: "Recurring rule must be set",
  }),
  interval: z.number().int().positive().max(30).default(1),
  byWeekday: z.array(z.nativeEnum(DayOfWeek)).default([]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  shiftDuration: z.number().int().positive(),
  baseStartTime: z.string().regex(timeRegex),
  baseEndTime: z.string().regex(timeRegex),
  timezone: z.string().default("UTC"),
});

export const expandRecurringSchema = z.object({
  templateId: z.string().cuid(),
  rangeStart: z.coerce.date(),
  rangeEnd: z.coerce.date(),
});

export const deleteRecurringSchema = z.object({
  templateId: z.string().cuid(),
  cascadeShifts: z.boolean().default(true),
});

