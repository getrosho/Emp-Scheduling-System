import { z } from "zod";
import { AssignmentStatus } from "@/generated/prisma/enums";

export const createAssignmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EMPLOYEE"),
    shiftId: z.string().cuid(),
    userId: z.string().cuid(),
  }),
  z.object({
    type: z.literal("SUBCONTRACTOR"),
    shiftId: z.string().cuid(),
    subcontractorId: z.string().cuid(),
    slotsRequested: z.number().int().positive().default(1),
  }),
]);

export const updateAssignmentStatusSchema = z.object({
  assignmentId: z.string().cuid(),
  assignmentType: z.enum(["EMPLOYEE", "SUBCONTRACTOR"]),
  status: z.nativeEnum(AssignmentStatus),
  slotsFilled: z.number().int().nonnegative().optional(),
});

