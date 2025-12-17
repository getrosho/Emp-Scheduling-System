import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { assignShiftSchema } from "@/lib/validations/shift-confirmation";
import { Role, AssignmentStatus } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { assertNoEmployeeConflicts } from "@/utils/shifts";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/shifts/[id]/assign
 * Assign a shift to an employee (Manager/Admin only)
 * Status: UNASSIGNED → ASSIGNED (creates assignment with PENDING status)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req, [Role.MANAGER, Role.ADMIN]);
    const { id } = await params;
    const body = await req.json();
    const payload = assignShiftSchema.parse(body);

    if (!id) {
      throw new AppError("Shift ID is required", 400);
    }

    // Get shift with relations
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        object: true,
        shiftAssignments: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!shift) {
      throw new AppError("Shift not found", 404);
    }

    // Verify user exists and is an employee
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        shiftAssignments: {
          where: {
            shift: {
              startTime: { lt: shift.endTime },
              endTime: { gt: shift.startTime },
              id: { not: id },
            },
          },
          include: {
            shift: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Allow assigning to employees and managers (managers are treated as workers)
    if (user.role !== Role.EMPLOYEE && user.role !== Role.MANAGER) {
      throw new AppError("Can only assign shifts to employees or managers", 400);
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.shiftAssignment.findUnique({
      where: {
        shiftId_userId: {
          shiftId: id,
          userId: payload.userId,
        },
      },
    });

    if (existingAssignment) {
      throw new AppError("Employee is already assigned to this shift", 409);
    }

    // Check for overlapping confirmed shifts
    await assertNoEmployeeConflicts([payload.userId], shift.startTime, shift.endTime, id);

    // Get employee record to check preferred objects
    const employee = await prisma.employee.findFirst({
      where: { email: user.email },
      include: {
        preferredObjects: true,
      },
    });

    // If shift has an object, verify it's in employee's preferred objects (warning only, not blocking)
    if (shift.objectId && employee?.preferredObjects) {
      const hasPreferredObject = employee.preferredObjects.some((obj) => obj.id === shift.objectId);
      if (!hasPreferredObject) {
        // Log warning but don't block assignment
        console.warn(
          `Employee ${employee.id} assigned to shift with object ${shift.objectId} not in preferred objects`
        );
      }
    }

    // Create assignment with PENDING status
    const assignment = await prisma.shiftAssignment.create({
      data: {
        shiftId: id,
        userId: payload.userId,
        status: AssignmentStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shift: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Update shift assignedEmployees array
    await prisma.shift.update({
      where: { id },
      data: {
        assignedEmployees: {
          set: [...shift.assignedEmployees, payload.userId],
        },
      },
    });

    // Create notification for employee
    await prisma.notification.create({
      data: {
        type: "SHIFT_ASSIGNED",
        message: `You have been assigned to shift: ${shift.title}`,
        recipientId: payload.userId,
        shiftId: id,
        metadata: {
          shiftId: id,
          shiftTitle: shift.title,
          date: shift.date,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "ASSIGN_SHIFT",
        entityType: "Shift",
        entityId: id,
        meta: {
          userId: payload.userId,
          userName: user.name,
        },
      },
    });

    return jsonResponse({ assignment });
  } catch (error) {
    return handleRouteError(error);
  }
}

