import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { weeklyHourLimitSchema } from "@/lib/validations/employees";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/employees/:id/weekly-limit
 * Get employee weekly hour limit
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
      select: { id: true, email: true, weeklyLimitHours: true },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    // Employees can only view their own limit
    if (actor.role === Role.EMPLOYEE) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
      });
      
      if (user?.email !== employee.email) {
        throw new AppError("Forbidden: You can only view your own weekly limit", 403);
      }
    }

    // Manager scope: verify employee is in their accessible locations
    // TODO: Implement location-based access control

    return jsonResponse({ 
      weeklyLimit: employee.weeklyLimitHours ? { hours: employee.weeklyLimitHours } : null 
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PUT /api/employees/:id/weekly-limit
 * Update employee weekly hour limit
 * RBAC: Admin (all), Manager (employees in their locations), Employee (forbidden)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req, [Role.ADMIN, Role.MANAGER]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Employee ID is required", 400);
    }
    
    // Employees cannot modify their own weekly limit
    if (actor.role === Role.EMPLOYEE) {
      throw new AppError("Forbidden: Employees cannot modify weekly hour limits", 403);
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    // Manager scope: verify employee is in their accessible locations
    // TODO: Implement location-based access control

    const body = await req.json();
    const payload = weeklyHourLimitSchema.parse(body);

    // Update the weeklyLimitHours field directly on the Employee model
    const updated = await prisma.employee.update({
      where: { id },
      data: {
        weeklyLimitHours: payload.hours,
      },
      select: {
        id: true,
        weeklyLimitHours: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE_EMPLOYEE_WEEKLY_LIMIT",
        entityType: "Employee",
        entityId: id,
        meta: {
          hours: payload.hours,
        },
      },
    });

    return jsonResponse({ 
      weeklyLimit: updated.weeklyLimitHours ? { hours: updated.weeklyLimitHours } : null 
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
