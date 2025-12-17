import { z } from "zod";

// Assign shift to employee
export const assignShiftSchema = z.object({
  userId: z.string().cuid(),
});

// Confirm shift assignment
export const confirmShiftSchema = z.object({
  note: z.string().max(500).optional(),
});

// Decline shift assignment
export const declineShiftSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
});

