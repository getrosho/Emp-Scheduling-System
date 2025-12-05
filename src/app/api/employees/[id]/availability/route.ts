import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { employeeAvailabilitySchema } from "@/lib/validations/employees";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/employees/:id/availability
 * Get employee availability
 * RBAC: Admin (all), Manager (employees in their locations), Employee (self only)
 */
export async function GET(req: NextRequest, { params }: Params) {
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

    // Employees can only view their own availability
    if (actor.role === Role.EMPLOYEE) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
      });
      
      if (user?.email !== employee.email) {
        throw new AppError("Forbidden: You can only view your own availability", 403);
      }
    }

    // Manager scope: verify employee is in their accessible locations
    // TODO: Implement location-based access control

    const availability = await prisma.availability.findMany({
      where: { employeeId: id },
      orderBy: [
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
 * Set employee availability (replaces existing)
 * RBAC: Admin (all), Manager (employees in their locations), Employee (self only)
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

    // Manager scope: verify employee is in their accessible locations
    // TODO: Implement location-based access control

    const body = await req.json();
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

    // Delete existing availability for this employee
    await prisma.availability.deleteMany({
      where: { employeeId: id },
    });

    // Find corresponding User by email (Employee and User models are separate)
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
      where: { employeeId: id },
      orderBy: [
        { dayOfWeek: "asc" },
        { day: "asc" },
      ],
    });

    return jsonResponse({ availability }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

