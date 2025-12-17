import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AssignmentStatus, EmployeeStatus } from "@/generated/prisma/enums";
import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    console.log("[Dashboard GET] Starting request");
    await requireAuth(req);
    console.log("[Dashboard GET] Auth passed");
    
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    console.log("[Dashboard GET] Querying data...");
    const [
      totalEmployees,
      activeShifts,
      totalObjects,
      pendingInternalAssignments,
      pendingSubcontractors,
      weeklyAssignments,
    ] = await Promise.all([
      prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      prisma.shift.count({
        where: {
          startTime: { lte: todayEnd },
          endTime: { gte: todayStart },
        },
      }),
      prisma.workLocation.count(),
      prisma.shiftAssignment.count({
        where: { status: AssignmentStatus.PENDING },
      }),
      prisma.subcontractorAssignment.count({
        where: { status: AssignmentStatus.PENDING },
      }),
      prisma.shiftAssignment.findMany({
        where: {
          shift: {
            startTime: { lte: weekEnd },
            endTime: { gte: weekStart },
          },
        },
        include: {
          shift: true,
          user: {
            include: { weeklyLimits: true },
          },
        },
      }),
    ]);
    
    console.log("[Dashboard GET] Data queried successfully");

    const weeklyMinutesByUser = weeklyAssignments.reduce<Record<string, number>>((acc, assignment) => {
      const shift = assignment.shift;
      if (!shift) return acc;
      
      // Calculate the actual overlap duration within the week
      // Shift already overlaps with week (filtered by query), but we need to count only the portion within the week
      const shiftStart = shift.startTime.getTime();
      const shiftEnd = shift.endTime.getTime();
      const weekStartTime = weekStart.getTime();
      const weekEndTime = weekEnd.getTime();
      
      // Calculate intersection: max(start) to min(end)
      const overlapStart = Math.max(shiftStart, weekStartTime);
      const overlapEnd = Math.min(shiftEnd, weekEndTime);
      const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);
      
      // Only count positive overlap (should always be positive due to query filter, but safety check)
      if (overlapMinutes > 0) {
        acc[assignment.userId] = (acc[assignment.userId] ?? 0) + overlapMinutes;
      }
      
      return acc;
    }, {});

    const weeklyHours = Object.values(weeklyMinutesByUser).reduce(
      (sum, minutes) => sum + minutes / 60,
      0,
    );

    const overtimeAlerts = weeklyAssignments.reduce((count, assignment) => {
      const user = assignment.user;
      if (!user?.weeklyLimits) return count;
      const minutes = weeklyMinutesByUser[user.id] ?? 0;
      return minutes > user.weeklyLimits.weeklyCapMinutes ? count + 1 : count;
    }, 0);

    const pendingRequests = pendingInternalAssignments + pendingSubcontractors;

    console.log("[Dashboard GET] Calculating metrics...");
    const result = {
      totalEmployees,
      activeShifts,
      totalObjects,
      pendingRequests,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      overtimeAlerts,
    };
    console.log("[Dashboard GET] Success, returning:", result);
    return jsonResponse(result);
  } catch (error) {
    console.error("[Dashboard GET] Error caught:", error);
    if (error instanceof Error) {
      console.error("[Dashboard GET] Error name:", error.name);
      console.error("[Dashboard GET] Error message:", error.message);
      console.error("[Dashboard GET] Error stack:", error.stack);
    }
    if (error && typeof error === "object" && "code" in error) {
      console.error("[Dashboard GET] Prisma error code:", (error as any).code);
      console.error("[Dashboard GET] Prisma error meta:", (error as any).meta);
    }
    return handleRouteError(error);
  }
}

