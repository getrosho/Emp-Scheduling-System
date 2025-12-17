import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";
import { AssignmentStatus } from "@/generated/prisma/enums";
import { startOfDay, endOfDay } from "date-fns";

/**
 * GET /api/employees/availability/date?date=YYYY-MM-DD
 * Get availability status for all employees on a specific date
 * Returns: array of { employeeId, isAvailable, hasOverlappingConfirmedShift }
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      throw new AppError("Date parameter (YYYY-MM-DD) is required", 400);
    }

    const targetDate = new Date(dateParam);
    const dateStart = startOfDay(targetDate);
    const dateEnd = endOfDay(targetDate);

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Get availability records for this date
    const availabilityRecords = await prisma.availability.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
      select: {
        id: true,
        employeeId: true,
        date: true,
        isAvailable: true,
        startTime: true,
        endTime: true,
      },
    });

    // Get all confirmed shifts for this date to check overlaps
    const confirmedShifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
        shiftAssignments: {
          some: {
            status: AssignmentStatus.ACCEPTED,
          },
        },
      },
      include: {
        shiftAssignments: {
          where: {
            status: AssignmentStatus.ACCEPTED,
          },
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    // Create a map of employee email to employee ID
    const employeeEmailMap = new Map<string, string>();
    employees.forEach((e) => {
      if (e.email) {
        employeeEmailMap.set(e.email, e.id);
      }
    });

    // Create a map of employee ID to confirmed shifts
    const employeeConfirmedShiftsMap = new Map<string, any[]>();
    confirmedShifts.forEach((shift) => {
      shift.shiftAssignments.forEach((assignment) => {
        const userEmail = assignment.user.email;
        if (userEmail) {
          const employeeId = employeeEmailMap.get(userEmail);
          if (employeeId) {
            if (!employeeConfirmedShiftsMap.has(employeeId)) {
              employeeConfirmedShiftsMap.set(employeeId, []);
            }
            employeeConfirmedShiftsMap.get(employeeId)!.push(shift);
          }
        }
      });
    });

    // Create availability map
    const availabilityMap = new Map<string, typeof availabilityRecords[0]>();
    availabilityRecords.forEach((record) => {
      if (record.employeeId) {
        availabilityMap.set(record.employeeId, record);
      }
    });

    // Build response
    const employeesAvailability = employees.map((employee) => {
      const availabilityRecord = availabilityMap.get(employee.id);
      const confirmedShifts = employeeConfirmedShiftsMap.get(employee.id) || [];
      
      return {
        employeeId: employee.id,
        isAvailable: availabilityRecord?.isAvailable ?? null, // null = no info
        hasOverlappingConfirmedShift: confirmedShifts.length > 0,
        availabilityRecord: availabilityRecord && availabilityRecord.date ? {
          id: availabilityRecord.id,
          date: availabilityRecord.date.toISOString(),
          isAvailable: availabilityRecord.isAvailable,
          startTime: availabilityRecord.startTime,
          endTime: availabilityRecord.endTime,
        } : undefined,
      };
    });

    return jsonResponse({ employees: employeesAvailability });
  } catch (error) {
    return handleRouteError(error);
  }
}

