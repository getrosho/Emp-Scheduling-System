import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { dateAvailabilitySchema } from "@/lib/validations/availability-dates";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string; availabilityId: string }> };

/**
 * PATCH /api/employees/:id/availability/:availabilityId
 * Update a specific availability record (date-based)
 * RBAC: Admin (all), Manager (employees in their objects), Employee (self only)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req);
    const { id, availabilityId } = await params;
    
    if (!id || !availabilityId) {
      throw new AppError("Employee ID and Availability ID are required", 400);
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

    const body = await req.json();
    const payload = dateAvailabilitySchema.parse(body);

    // Verify the availability record belongs to this employee
    const existing = await prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!existing) {
      throw new AppError("Availability record not found", 404);
    }

    if (existing.employeeId !== id) {
      throw new AppError("Availability record does not belong to this employee", 403);
    }

    // Update the availability record
    const updated = await prisma.availability.update({
      where: { id: availabilityId },
      data: {
        date: new Date(payload.date),
        isAvailable: payload.isAvailable,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE_AVAILABILITY_RECORD",
        entityType: "Availability",
        entityId: availabilityId,
        meta: {
          employeeId: id,
          date: payload.date,
          isAvailable: payload.isAvailable,
        },
      },
    });

    return jsonResponse({ availability: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

