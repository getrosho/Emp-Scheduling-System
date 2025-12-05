import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createAssignmentSchema, updateAssignmentStatusSchema } from "@/lib/validations";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { assertNoEmployeeConflicts, recalculateShiftStatus } from "@/utils/shifts";
import { DayOfWeek } from "@/generated/prisma/enums";

const dayMap: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUN,
  1: DayOfWeek.MON,
  2: DayOfWeek.TUE,
  3: DayOfWeek.WED,
  4: DayOfWeek.THU,
  5: DayOfWeek.FRI,
  6: DayOfWeek.SAT,
};

/**
 * Converts a Date to a specific timezone and extracts day of week and time in minutes
 * @param date - The date to convert
 * @param timezone - IANA timezone string (e.g., "America/New_York", "UTC")
 * @returns Object with day of week and minutes since midnight in the target timezone
 */
function getDateInTimezone(date: Date, timezone: string): { day: DayOfWeek; minutes: number } {
  // Format date in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";

  const weekdayMap: Record<string, DayOfWeek> = {
    Sun: DayOfWeek.SUN,
    Mon: DayOfWeek.MON,
    Tue: DayOfWeek.TUE,
    Wed: DayOfWeek.WED,
    Thu: DayOfWeek.THU,
    Fri: DayOfWeek.FRI,
    Sat: DayOfWeek.SAT,
  };

  return {
    day: weekdayMap[weekday] ?? DayOfWeek.MON,
    minutes: hours * 60 + minutes,
  };
}

/**
 * Converts a time string (HH:MM) to minutes since midnight
 */
const timeStringToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const shiftId = req.nextUrl.searchParams.get("shiftId") ?? undefined;
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

    const [employeeAssignments, subcontractorAssignments] = await Promise.all([
      prisma.shiftAssignment.findMany({
        where: { shiftId, userId },
        include: { shift: true, user: true },
      }),
      prisma.subcontractorAssignment.findMany({
        where: { shiftId, subcontractorId: userId },
        include: { shift: true, subcontractor: true },
      }),
    ]);

    return jsonResponse({ employeeAssignments, subcontractorAssignments });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[Assignments POST] Starting request");
    await requireAuth(req);
    console.log("[Assignments POST] Auth passed");
    
    const body = await req.json();
    console.log("[Assignments POST] Request body:", JSON.stringify(body));
    
    const payload = createAssignmentSchema.parse(body);
    console.log("[Assignments POST] Parsed payload:", JSON.stringify(payload));

    const shift = await prisma.shift.findUnique({ where: { id: payload.shiftId } });
    if (!shift) {
      throw new AppError("Shift not found", 404);
    }
    console.log("[Assignments POST] Shift found:", shift.id);

    if (payload.type === "EMPLOYEE") {
      console.log("[Assignments POST] Checking employee availability for userId:", payload.userId);
      const availability = await prisma.availability.findMany({
        where: { userId: payload.userId },
      });
      console.log("[Assignments POST] Found availability slots:", availability.length);

      // If no availability slots exist, allow assignment (employee can be assigned even without availability set)
      // This is more flexible - availability is optional
      let coverage = false;
      if (availability.length > 0) {
        // Check availability for each slot, converting shift times to the slot's timezone
        coverage = availability.some((slot) => {
          // Type guard: ensure required fields are present
          if (!slot.startTime || !slot.endTime) {
            return false;
          }
          try {
            const slotTimezone = slot.timezone || "UTC";
            
            // Convert shift times to the availability slot's timezone
            const shiftStartInTz = getDateInTimezone(shift.startTime, slotTimezone);
            const shiftEndInTz = getDateInTimezone(shift.endTime, slotTimezone);

            // Check if the shift day matches the availability day
            if (slot.day !== shiftStartInTz.day) {
              return false;
            }
            
            // Now we know startTime and endTime are strings (not null)
            const slotStartTime = slot.startTime;
            const slotEndTime = slot.endTime;

            // Convert availability times to minutes
            const availabilityStart = timeStringToMinutes(slot.startTime);
            const availabilityEnd = timeStringToMinutes(slot.endTime);

            // Check if shift is fully within availability window
            // Shift must start >= availability start AND shift must end <= availability end
            return (
              shiftStartInTz.minutes >= availabilityStart &&
              shiftEndInTz.minutes <= availabilityEnd
            );
          } catch (error) {
            console.error("[Assignments POST] Error checking availability slot:", error);
            return false;
          }
        });
      } else {
        // No availability slots - allow assignment (availability is optional)
        console.log("[Assignments POST] No availability slots found, allowing assignment");
        coverage = true;
      }

      if (!coverage) {
        console.log("[Assignments POST] Employee not available for shift");
        throw new AppError("Employee not available for this shift", 409);
      }

      console.log("[Assignments POST] Checking for conflicts");
      await assertNoEmployeeConflicts([payload.userId], shift.startTime, shift.endTime, shift.id);
      console.log("[Assignments POST] No conflicts found, creating assignment");

      const assignment = await prisma.shiftAssignment.create({
        data: {
          shiftId: payload.shiftId,
          userId: payload.userId,
        },
      });
      console.log("[Assignments POST] Assignment created successfully:", assignment.id);
      return jsonResponse({ assignment }, { status: 201 });
    }

    console.log("[Assignments POST] Creating subcontractor assignment");
    const assignment = await prisma.subcontractorAssignment.create({
      data: {
        shiftId: payload.shiftId,
        subcontractorId: payload.subcontractorId,
        slotsRequested: payload.slotsRequested,
      },
    });
    return jsonResponse({ assignment }, { status: 201 });
  } catch (error) {
    console.error("[Assignments POST] Error caught:", error);
    if (error instanceof Error) {
      console.error("[Assignments POST] Error name:", error.name);
      console.error("[Assignments POST] Error message:", error.message);
      console.error("[Assignments POST] Error stack:", error.stack);
    }
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(req);
    const payload = updateAssignmentStatusSchema.parse(await req.json());

    if (payload.assignmentType === "EMPLOYEE") {
      const assignment = await prisma.shiftAssignment.update({
        where: { id: payload.assignmentId },
        data: {
          status: payload.status,
        },
      });
      await recalculateShiftStatus(assignment.shiftId);
      return jsonResponse({ assignment });
    }

    const assignment = await prisma.subcontractorAssignment.update({
      where: { id: payload.assignmentId },
      data: {
        status: payload.status,
        slotsFilled: payload.slotsFilled ?? undefined,
      },
    });
    return jsonResponse({ assignment });
  } catch (error) {
    return handleRouteError(error);
  }
}

