import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { employeeAvailabilitySchema } from "@/lib/validations/employees";
import { bulkDateAvailabilitySchema, availabilityDateRangeSchema } from "@/lib/validations/availability-dates";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/employees/:id/availability
 * Get employee availability (weekly and date-based)
 * Query params:
 *   - month: YYYY-MM (optional, for date-based availability)
 *   - type: "weekly" | "dates" | "all" (default: "all")
 * RBAC: Admin (all), Manager (employees in their objects), Employee (self only)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req);
    const { id } = await params;
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get("month"); // YYYY-MM format
    const type = searchParams.get("type") || "all"; // weekly, dates, or all
    
    if (!id) {
      throw new AppError("Employee ID is required", 400);
    }
    
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    // Employees can only view their own availability
    if (actor.role === Role.EMPLOYEE) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
      });
      
      if (user?.email !== employee.email) {
        throw new AppError("Forbidden: You can only view your own availability", 403);
      }
    }

    // Manager scope: verify employee is in their accessible objects
    // TODO: Implement object-based access control

    const where: any = { employeeId: id };

    // If month is provided, get date-based availability for that month
    if (month && (type === "dates" || type === "all")) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59);
      
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (type === "dates") {
      // Only date-based availability
      where.date = { not: null };
    } else if (type === "weekly") {
      // Only weekly availability
      where.date = null;
    }

    const availability = await prisma.availability.findMany({
      where,
      orderBy: [
        { date: "asc" },
        { dayOfWeek: "asc" },
        { day: "asc" },
      ],
    });

    return jsonResponse({ availability });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/employees/:id/availability
 * Set employee availability
 * Body can be:
 *   1. Weekly availability (existing): { availability: [{ day, startTime, endTime, timezone }] }
 *   2. Date-based availability (new): { availabilities: [{ date, isAvailable }] }
 * RBAC: Admin (all), Manager (employees in their objects), Employee (self only)
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Employee ID is required", 400);
    }
    
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    // Employees can only update their own availability
    if (actor.role === Role.EMPLOYEE) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
      });
      
      if (user?.email !== employee.email) {
        throw new AppError("Forbidden: You can only update your own availability", 403);
      }
    }

    // Manager scope: verify employee is in their accessible objects
    // TODO: Implement object-based access control

    const body = await req.json();

    // Check if this is date-based availability
    if (body.availabilities && Array.isArray(body.availabilities)) {
      // Date-based availability
      const payload = bulkDateAvailabilitySchema.parse({ ...body, employeeId: id });

      // Find corresponding User by email
      const user = await prisma.user.findUnique({
        where: { email: employee.email },
        select: { id: true },
      });

      if (!user) {
        throw new AppError("No user account found for this employee. Please create a user account first.", 404);
      }

      // Delete existing date-based availability for the dates being updated
      const dates = payload.availabilities.map((av) => new Date(av.date));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      
      // Set time to start/end of day
      minDate.setHours(0, 0, 0, 0);
      maxDate.setHours(23, 59, 59, 999);

      await prisma.availability.deleteMany({
        where: {
          employeeId: id,
          date: {
            gte: minDate,
            lte: maxDate,
          },
        },
      });

      // Create new date-based availability records
      const created = await prisma.availability.createMany({
        data: payload.availabilities.map((av) => ({
          employeeId: id,
          userId: user.id,
          date: new Date(av.date),
          isAvailable: av.isAvailable,
          day: "MON" as any, // Required field, but not used for date-based
          dayOfWeek: new Date(av.date).getDay(),
          startTime: null,
          endTime: null,
          timezone: "UTC",
        })),
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "UPDATE_EMPLOYEE_DATE_AVAILABILITY",
          entityType: "Employee",
          entityId: id,
          meta: {
            datesCount: created.count,
          },
        },
      });

      // Fetch updated availability
      const availability = await prisma.availability.findMany({
        where: {
          employeeId: id,
          date: {
            gte: minDate,
            lte: maxDate,
          },
        },
        orderBy: { date: "asc" },
      });

      return jsonResponse({ availability }, { status: 201 });
    } else {
      // Weekly availability (existing logic)
      const payload = employeeAvailabilitySchema.parse({ ...body, employeeId: id });

      // Validate time ranges
      for (const slot of payload.availability) {
        const [startHours, startMinutes] = slot.startTime.split(":").map(Number);
        const [endHours, endMinutes] = slot.endTime.split(":").map(Number);
        const startTotal = startHours * 60 + startMinutes;
        const endTotal = endHours * 60 + endMinutes;

        if (startTotal >= endTotal) {
          throw new AppError(`Invalid time range for ${slot.day}: end time must be after start time`, 400);
        }
      }

      // Delete existing weekly availability for this employee
      await prisma.availability.deleteMany({
        where: {
          employeeId: id,
          date: null, // Only delete weekly availability
        },
      });

      // Find corresponding User by email
      const user = await prisma.user.findUnique({
        where: { email: employee.email },
        select: { id: true },
      });

      if (!user) {
        throw new AppError("No user account found for this employee. Please create a user account first.", 404);
      }

      // Map DayOfWeek enum to dayOfWeek integer
      const dayToInt: Record<string, number> = {
        MON: 1,
        TUE: 2,
        WED: 3,
        THU: 4,
        FRI: 5,
        SAT: 6,
        SUN: 0,
      };

      // Create new availability slots
      const created = await prisma.availability.createMany({
        data: payload.availability.map((slot) => ({
          employeeId: id,
          userId: user.id,
          day: slot.day,
          dayOfWeek: dayToInt[slot.day] ?? 0,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: slot.timezone,
          date: null, // Weekly availability
          isAvailable: null, // Not used for weekly
        })),
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "UPDATE_EMPLOYEE_AVAILABILITY",
          entityType: "Employee",
          entityId: id,
          meta: {
            slotsCount: created.count,
          },
        },
      });

      // Fetch updated availability
      const availability = await prisma.availability.findMany({
        where: {
          employeeId: id,
          date: null,
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { day: "asc" },
        ],
      });

      return jsonResponse({ availability }, { status: 201 });
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
