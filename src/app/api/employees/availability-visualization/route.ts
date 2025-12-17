import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";
import { AssignmentStatus, Role, EmployeeStatus } from "@/generated/prisma/enums";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns";

/**
 * GET /api/employees/availability-visualization?month=YYYY-MM
 * Get employee availability visualization data for a month
 * Returns: employees with their availability status and allocated hours per day
 */
export async function GET(req: NextRequest) {
  try {
    // Allow ADMIN and MANAGER roles
    await requireAuth(req, [Role.ADMIN, Role.MANAGER]);
    
    const searchParams = req.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // YYYY-MM format
    
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      throw new AppError("Month parameter (YYYY-MM) is required", 400);
    }

    const [year, month] = monthParam.split("-").map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(new Date(year, month - 1, 1));
    const monthStartDay = startOfDay(monthStart);
    const monthEndDay = endOfDay(monthEnd);

    // Check if filtering for subcontractors
    const subcontractorParam = searchParams.get("subcontractor");
    const isSubcontractor = subcontractorParam === "true";

    // Get all active employees (or subcontractors if filtered)
    const employees = await prisma.employee.findMany({
      where: {
        status: EmployeeStatus.ACTIVE,
        subcontractor: isSubcontractor ? true : undefined, // If subcontractor=true, filter for subcontractors; otherwise get all
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
      orderBy: {
        fullName: "asc",
      },
    });

    // Get all availability records for this month
    // Only query if there are employees to avoid empty array issues
    const employeeIds = employees.map((e) => e.id);
    let availabilityRecords: Array<{
      id: string;
      employeeId: string | null;
      date: Date | null;
      isAvailable: boolean | null;
    }> = [];
    
    if (employeeIds.length > 0) {
      try {
        availabilityRecords = await prisma.availability.findMany({
          where: {
            employeeId: { in: employeeIds },
            date: {
              gte: monthStartDay,
              lte: monthEndDay,
            },
          },
          select: {
            id: true,
            employeeId: true,
            date: true,
            isAvailable: true,
          },
        });
      } catch (dbError: any) {
        // If the column doesn't exist, log the error and continue with empty array
        console.error("[Availability Visualization] Database error:", dbError);
        if (dbError.message?.includes("does not exist") || dbError.message?.includes("not available")) {
          console.warn("[Availability Visualization] Database schema may be out of sync. The 'isAvailable' column may not exist. Please run migrations or update the database schema.");
          // Return empty array to allow the page to load
          availabilityRecords = [];
        } else {
          throw dbError;
        }
      }
    }

    // Get all shifts with assignments for this month
    let shifts: Array<{
      id: string;
      date: Date;
      durationMinutes: number;
      shiftAssignments: Array<{
        user: {
          email: string;
        };
      }>;
    }> = [];
    
    try {
      shifts = await prisma.shift.findMany({
        where: {
          date: {
            gte: monthStartDay,
            lte: monthEndDay,
          },
        },
        include: {
          shiftAssignments: {
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
    } catch (shiftError: any) {
      // If the error is about missing tables/columns, log and continue with empty array
      console.error("[Availability Visualization] Shift query error:", shiftError);
      if (shiftError.message?.includes("does not exist") || shiftError.message?.includes("not available")) {
        console.warn("[Availability Visualization] Shift or ShiftAssignment tables may not exist or schema may be out of sync. Continuing without shift data.");
        shifts = [];
      } else {
        // Re-throw if it's a different error
        throw shiftError;
      }
    }

    // Create a map of employee email to employee ID
    const employeeEmailMap = new Map<string, string>();
    employees.forEach((e) => {
      if (e.email) {
        employeeEmailMap.set(e.email, e.id);
      }
    });

    // Create a map: employeeId -> date -> { isAvailable, allocatedHours }
    const employeeDataMap = new Map<string, Map<string, { isAvailable: boolean | null; allocatedHours: number }>>();
    
    // Initialize map for all employees
    employees.forEach((emp) => {
      employeeDataMap.set(emp.id, new Map());
    });

    // Process availability records
    availabilityRecords.forEach((record) => {
      if (record.employeeId && record.date) {
        const dateStr = format(record.date, "yyyy-MM-dd");
        const empMap = employeeDataMap.get(record.employeeId);
        if (empMap) {
          empMap.set(dateStr, {
            isAvailable: record.isAvailable,
            allocatedHours: 0, // Will be updated from shifts
          });
        }
      }
    });

    // Process shifts to calculate allocated hours
    shifts.forEach((shift) => {
      const shiftDate = format(shift.date, "yyyy-MM-dd");
      const shiftHours = shift.durationMinutes / 60;
      
      shift.shiftAssignments.forEach((assignment) => {
        const userEmail = assignment.user.email;
        if (userEmail) {
          const employeeId = employeeEmailMap.get(userEmail);
          if (employeeId) {
            const empMap = employeeDataMap.get(employeeId);
            if (empMap) {
              const existing = empMap.get(shiftDate);
              if (existing) {
                existing.allocatedHours += shiftHours;
              } else {
                empMap.set(shiftDate, {
                  isAvailable: null, // No availability data
                  allocatedHours: shiftHours,
                });
              }
            }
          }
        }
      });
    });

    // Build response
    const employeesData = employees.map((employee) => {
      const empMap = employeeDataMap.get(employee.id) || new Map();
      const daysData: Record<string, { isAvailable: boolean | null; allocatedHours: number }> = {};
      
      empMap.forEach((value, dateStr) => {
        daysData[dateStr] = value;
      });

      // Check if employee has any availability data at all
      const hasAnyAvailability = availabilityRecords.some((r) => r.employeeId === employee.id);

      return {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        days: daysData,
        hasAnyAvailability, // For showing "Send reminder" button
      };
    });

    return jsonResponse({ employees: employeesData, month: monthParam });
  } catch (error) {
    return handleRouteError(error);
  }
}


