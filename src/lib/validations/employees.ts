import { z } from "zod";
import { Role, EmployeeStatus, EmployeeRole, DayOfWeek } from "@/generated/prisma/enums";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Employee Filter Schema
export const employeeFilterSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  objectId: z.string().cuid().optional(),
  subcontractor: z.coerce.boolean().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).passthrough(); // Allow extra fields to pass through

// Create Employee Schema
export const createEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(200),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.nativeEnum(EmployeeRole).default(EmployeeRole.EMPLOYEE),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
  subcontractor: z.boolean().default(false),
  preferredObjectIds: z.array(z.string().cuid()).default([]),
  weeklyLimitHours: z.number().int().min(0).max(168).optional(), // Max 168 hours (7 days)
  availability: z
    .array(
      z.object({
        day: z.nativeEnum(DayOfWeek),
        start: z.string().regex(timeRegex, "Start time must be in HH:mm format").nullable(),
        end: z.string().regex(timeRegex, "End time must be in HH:mm format").nullable(),
      })
    )
    .length(7, "Must have exactly 7 availability slots (one for each day)")
    .refine(
      (slots) => {
        // If start or end exists, both must exist
        return slots.every((slot) => {
          const hasStart = slot.start !== null;
          const hasEnd = slot.end !== null;
          return (!hasStart && !hasEnd) || (hasStart && hasEnd);
        });
      },
      {
        message: "If start time is set, end time must also be set, and vice versa",
      }
    )
    .refine(
      (slots) => {
        // End must be after start
        return slots.every((slot) => {
          if (!slot.start || !slot.end) return true;
          const [startHours, startMinutes] = slot.start.split(":").map(Number);
          const [endHours, endMinutes] = slot.end.split(":").map(Number);
          const startTotal = startHours * 60 + startMinutes;
          const endTotal = endHours * 60 + endMinutes;
          return endTotal > startTotal;
        });
      },
      {
        message: "End time must be after start time",
      }
    ),
  notes: z.string().max(1000).optional(),
});

// Update Employee Schema
export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .extend({
    email: z.string().email("Invalid email address").optional(),
  });

// Edit Employee Form Schema (with availability validation) - same as create schema
export const editEmployeeFormSchema = createEmployeeSchema;

// Assign Role Schema
export const assignRoleSchema = z.object({
  role: z.nativeEnum(EmployeeRole),
});

// Assign Preferred Objects Schema
export const assignPreferredObjectsSchema = z.object({
  objectIds: z.array(z.string().cuid()).min(0),
});

// Availability Management Schema
export const employeeAvailabilitySchema = z.object({
  employeeId: z.string().cuid(),
  availability: z.array(
    z.object({
      day: z.nativeEnum(DayOfWeek),
      startTime: z.string().regex(timeRegex, "Start time must be in HH:mm format"),
      endTime: z.string().regex(timeRegex, "End time must be in HH:mm format"),
      timezone: z.string().default("UTC"),
    })
  ),
});

// Availability Form Schema (for UI forms - uses start/end instead of startTime/endTime)
export const availabilityFormSchema = z.object({
  availability: z
    .array(
      z.object({
        day: z.nativeEnum(DayOfWeek),
        start: z.string().regex(timeRegex, "Start time must be in HH:mm format").nullable(),
        end: z.string().regex(timeRegex, "End time must be in HH:mm format").nullable(),
      })
    )
    .length(7, "Must have exactly 7 availability slots (one for each day)")
    .refine(
      (slots) => {
        // If start or end exists, both must exist
        return slots.every((slot) => {
          const hasStart = slot.start !== null;
          const hasEnd = slot.end !== null;
          return (!hasStart && !hasEnd) || (hasStart && hasEnd);
        });
      },
      {
        message: "If start time is set, end time must also be set, and vice versa",
      }
    )
    .refine(
      (slots) => {
        // End must be after start
        return slots.every((slot) => {
          if (!slot.start || !slot.end) return true;
          const [startHours, startMinutes] = slot.start.split(":").map(Number);
          const [endHours, endMinutes] = slot.end.split(":").map(Number);
          const startTotal = startHours * 60 + startMinutes;
          const endTotal = endHours * 60 + endMinutes;
          return endTotal > startTotal;
        });
      },
      {
        message: "End time must be after start time",
      }
    ),
});

// Single Availability Slot Schema
export const availabilitySlotSchema = z.object({
  day: z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(timeRegex, "Start time must be in HH:mm format"),
  endTime: z.string().regex(timeRegex, "End time must be in HH:mm format"),
  timezone: z.string().default("UTC"),
});

// Weekly Hour Limit Schema (for API)
export const weeklyHourLimitSchema = z.object({
  hours: z.number().int().positive().max(168, "Maximum 168 hours per week"), // Max 7 days
});

// Weekly Limit Form Schema (for UI form - matches editEmployeeFormSchema structure)
export const weeklyLimitFormSchema = z.object({
  weeklyLimitHours: z.number().int().min(0).max(168).optional(), // Max 168 hours (7 days)
});

// Delete Employee Schema (soft delete confirmation)
export const deleteEmployeeSchema = z.object({
  confirm: z.boolean().refine((val) => val === true, {
    message: "Deletion must be confirmed",
  }),
});

