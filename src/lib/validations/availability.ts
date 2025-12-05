import { z } from "zod";
import { DayOfWeek } from "@/generated/prisma/enums";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const availabilityCreateSchema = z.object({
  userId: z.string().cuid(),
  day: z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(timeRegex, "Use HH:mm"),
  endTime: z.string().regex(timeRegex, "Use HH:mm"),
  timezone: z.string().default("UTC"),
});

export const availabilityUpdateSchema = availabilityCreateSchema
  .omit({ userId: true })
  .extend({
    id: z.string().cuid(),
  });

