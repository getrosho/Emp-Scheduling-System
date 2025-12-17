import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AssignmentStatus } from "@/generated/prisma/enums";
import { startOfMonth, endOfMonth, eachDayOfInterval, getDate, format } from "date-fns";

type Status = "none" | "red" | "orange" | "green";

interface MonthStatusItem {
  objectId: string;
  date: string; // YYYY-MM-DD
  status: Status;
  shiftId?: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const searchParams = req.nextUrl.searchParams;
    const monthParam = searchParams.get("month");
    
    if (!monthParam) {
      return jsonResponse({ error: "Month parameter is required (format: YYYY-MM)" }, { status: 400 });
    }

    // Parse month (YYYY-MM)
    const [year, month] = monthParam.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return jsonResponse({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
    }

    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get all objects
    const objects = await prisma.workLocation.findMany({
      orderBy: { label: "asc" },
    });

    // Get all shifts for the month
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        shiftAssignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        subcontractorDemands: true,
        object: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

    // Create a map: objectId -> day -> shift
    const shiftsByObjectAndDay = new Map<string, Map<number, typeof shifts[0]>>();
    
    shifts.forEach((shift) => {
      const objectId = shift.objectId || "no-object";
      const day = getDate(new Date(shift.date));
      
      if (!shiftsByObjectAndDay.has(objectId)) {
        shiftsByObjectAndDay.set(objectId, new Map());
      }
      
      const dayMap = shiftsByObjectAndDay.get(objectId)!;
      // If multiple shifts on same day, prefer the one with more assignments
      const existingShift = dayMap.get(day);
      if (!existingShift || 
          (shift.shiftAssignments.length + shift.subcontractorDemands.length) > 
          (existingShift.shiftAssignments.length + existingShift.subcontractorDemands.length)) {
        dayMap.set(day, shift);
      }
    });

    // Calculate status for each object-day combination
    const statuses: MonthStatusItem[] = [];

    objects.forEach((object) => {
      daysInMonth.forEach((day) => {
        const dayNum = getDate(day);
        const objectShifts = shiftsByObjectAndDay.get(object.id);
        const shift = objectShifts?.get(dayNum);

        let status: Status = "none";
        let shiftId: string | undefined;

        if (shift) {
          shiftId = shift.id;
          const assignments = shift.shiftAssignments || [];
          const subcontractors = shift.subcontractorDemands || [];
          const requiredWorkers = shift.requiredWorkers || 1;
          const totalAllocated = assignments.length + subcontractors.length;

          // RED: Not all required workers are allocated
          if (totalAllocated < requiredWorkers) {
            status = "red";
          } else {
            // Check if all assignments are confirmed
            const allConfirmed =
              assignments.every((a) => a.status === AssignmentStatus.ACCEPTED) &&
              subcontractors.every((s) => s.status === AssignmentStatus.ACCEPTED);

            // GREEN: All allocated workers have confirmed
            if (allConfirmed && totalAllocated >= requiredWorkers) {
              status = "green";
            } else {
              // ORANGE: All required workers allocated, but at least one hasn't confirmed
              status = "orange";
            }
          }
        }

        statuses.push({
          objectId: object.id,
          date: format(day, "yyyy-MM-dd"),
          status,
          ...(shiftId && { shiftId }),
        });
      });
    });

    return jsonResponse({ statuses });
  } catch (error) {
    return handleRouteError(error);
  }
}

