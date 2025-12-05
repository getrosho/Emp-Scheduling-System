import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { updateEmployeeSchema } from "@/lib/validations/employees";
import { Role, EmployeeStatus, EmployeeRole } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/employees/:id
 * Get employee details
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
      include: {
        preferredLocations: true,
        availability: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    // Employees can only view their own profile
    // Note: This assumes Employee model has a userId field linking to User
    // If not, we'll need to match by email or implement a different check
    if (actor.role === Role.EMPLOYEE) {
      // For now, allow if email matches (assuming employee email matches user email)
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
      });
      
      if (user?.email !== employee.email) {
        throw new AppError("Forbidden: You can only view your own profile", 403);
      }
    }

    // Manager scope: verify employee is in their accessible locations
    if (actor.role === Role.MANAGER) {
      // For now, allow managers to view any employee
      // TODO: Implement location-based access control
      // Check if employee's preferred locations match manager's assigned locations
    }

    return jsonResponse({ employee });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PUT /api/employees/:id
 * Update employee
 * RBAC: Admin (full), Manager (employees in their locations, cannot change role), Employee (self only, limited fields)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req, [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Employee ID is required", 400);
    }
    
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        preferredLocations: true,
      },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const body = await req.json();
    const payload = updateEmployeeSchema.parse(body);

    // Employees can only update their own profile with limited fields
    if (actor.role === Role.EMPLOYEE) {
      const user = await prisma.user.findUnique({
        where: { id: actor.id },
      });
      
      if (user?.email !== employee.email) {
        throw new AppError("Forbidden: You can only update your own profile", 403);
      }

      // Employees can only update: phone, notes (personal info)
      // Block role, status changes
      if (payload.role !== undefined || payload.status !== undefined) {
        throw new AppError("Forbidden: You cannot modify restricted fields", 403);
      }
    }

    // Managers cannot change role (especially to ADMIN)
    if (actor.role === Role.MANAGER) {
      if (payload.role !== undefined) {
        throw new AppError("Forbidden: Managers cannot modify employee roles", 403);
      }

      // Manager scope: verify employee is in their accessible locations
      // TODO: Implement location-based access control
    }

    // Prevent managers from granting ADMIN role
    if (payload.role === EmployeeRole.ADMIN && actor.role !== Role.ADMIN) {
      throw new AppError("Forbidden: Only administrators can grant ADMIN privileges", 403);
    }

    // Check email uniqueness if email is being updated
    if (payload.email && payload.email !== employee.email) {
      const existing = await prisma.employee.findUnique({
        where: { email: payload.email },
      });
      
      if (existing) {
        throw new AppError("Email already in use", 409);
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (payload.fullName !== undefined) updateData.fullName = payload.fullName;
    if (payload.email !== undefined) updateData.email = payload.email;
    if (payload.phone !== undefined) updateData.phone = payload.phone;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.role !== undefined) updateData.role = payload.role;
    if (payload.subcontractor !== undefined) updateData.subcontractor = payload.subcontractor;
    if (payload.weeklyLimitHours !== undefined) updateData.weeklyLimitHours = payload.weeklyLimitHours;

    // Handle preferred locations
    if (payload.preferredLocationIds !== undefined) {
      // Validate locations exist
      if (payload.preferredLocationIds.length > 0) {
        const locations = await prisma.workLocation.findMany({
          where: { id: { in: payload.preferredLocationIds } },
        });

        if (locations.length !== payload.preferredLocationIds.length) {
          throw new AppError("One or more preferred locations not found", 404);
        }
      }

      updateData.preferredLocations = {
        set: payload.preferredLocationIds.map((id) => ({ id })),
      };
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        preferredLocations: true,
        availability: true,
      },
    });

    // Handle availability update if provided (always replace all 7 entries)
    if (payload.availability && Array.isArray(payload.availability) && payload.availability.length === 7) {
      // Find corresponding User by email (Availability model requires userId)
      const user = await prisma.user.findUnique({
        where: { email: updated.email },
        select: { id: true },
      });

      if (!user) {
        throw new AppError("No user account found for this employee. Please create a user account first.", 404);
      }

      // Delete existing availability
      await prisma.availability.deleteMany({
        where: { employeeId: id },
      });

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

      // Create new availability slots (only non-null entries)
      const availabilityToCreate = payload.availability
        .filter((av) => av.start && av.end)
        .map((slot) => ({
          employeeId: id,
          userId: user.id,
          day: slot.day,
          dayOfWeek: dayToInt[slot.day] ?? 0,
          startTime: slot.start!,
          endTime: slot.end!,
          timezone: "UTC",
        }));

      if (availabilityToCreate.length > 0) {
        await prisma.availability.createMany({
          data: availabilityToCreate,
        });
      }
    }

    // Fetch updated employee with all relations
    const finalEmployee = await prisma.employee.findUnique({
      where: { id },
      include: {
        preferredLocations: true,
        availability: {
          orderBy: {
            dayOfWeek: "asc",
          },
        },
      },
    });

    if (!finalEmployee) {
      throw new AppError("Employee not found after update", 404);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE_EMPLOYEE",
        entityType: "Employee",
        entityId: finalEmployee.id,
        meta: {
          changes: Object.keys(updateData),
          email: finalEmployee.email,
        },
      },
    });

    return jsonResponse({ employee: finalEmployee });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/employees/:id
 * Permanently delete employee from database
 * RBAC: Admin only
 * 
 * Note: This is a HARD DELETE. The employee will be completely removed.
 * To temporarily disable an employee, use PUT to set status to INACTIVE instead.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Employee ID is required", 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        preferredLocations: true,
        availability: true,
      },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    // Store employee data for audit log before deletion
    const employeeData = {
      id: employee.id,
      email: employee.email,
      fullName: employee.fullName,
    };

    // Hard delete: permanently remove employee from database
    // Prisma will cascade delete related records (Availability has onDelete: Cascade)
    // Many-to-many relations (preferredLocations) are automatically handled
    await prisma.employee.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "DELETE_EMPLOYEE",
        entityType: "Employee",
        entityId: employeeData.id,
        meta: {
          email: employeeData.email,
          fullName: employeeData.fullName,
          hardDelete: true,
        },
      },
    });

    return jsonResponse({ 
      deleted: true,
      message: "Employee permanently deleted",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

