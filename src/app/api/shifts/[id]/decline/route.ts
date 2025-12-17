import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { declineShiftSchema } from "@/lib/validations/shift-confirmation";
import { Role, AssignmentStatus } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/shifts/[id]/decline
 * Decline a shift assignment (Employee only)
 * Status: ASSIGNED (PENDING) → UNASSIGNED (DECLINED, then assignment removed)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Allow employees and managers to decline shifts (managers are treated as workers)
    const actor = await requireAuth(req, [Role.EMPLOYEE, Role.MANAGER]);
    const { id } = await params;
    const body = await req.json();
    const payload = declineShiftSchema.parse(body);

    if (!id) {
      throw new AppError("Shift ID is required", 400);
    }

    // Get shift with relations
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        shiftAssignments: {
          where: {
            userId: actor.id,
          },
        },
      },
    });

    if (!shift) {
      throw new AppError("Shift not found", 404);
    }

    // Find assignment for this employee
    const assignment = shift.shiftAssignments.find((a) => a.userId === actor.id);

    if (!assignment) {
      throw new AppError("You are not assigned to this shift", 404);
    }

    if (assignment.status === AssignmentStatus.ACCEPTED) {
      throw new AppError("Cannot decline a confirmed shift. Please contact an administrator.", 400);
    }

    // Update assignment to DECLINED with reason
    await prisma.shiftAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.DECLINED,
        declinedAt: new Date(),
        note: payload.reason,
      },
    });

    // Remove from shift's assignedEmployees array
    await prisma.shift.update({
      where: { id },
      data: {
        assignedEmployees: {
          set: shift.assignedEmployees.filter((userId) => userId !== actor.id),
        },
      },
    });

    // Delete the assignment (returning to UNASSIGNED state)
    await prisma.shiftAssignment.delete({
      where: { id: assignment.id },
    });

    // Check if shift has any remaining assignments
    const remainingAssignments = await prisma.shiftAssignment.findMany({
      where: { shiftId: id },
    });

    // If no assignments remain, shift status should reflect this
    if (remainingAssignments.length === 0) {
      await prisma.shift.update({
        where: { id },
        data: {
          status: "PUBLISHED" as any, // Back to PUBLISHED (UNASSIGNED)
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "DECLINE_SHIFT",
        entityType: "Shift",
        entityId: id,
        meta: {
          shiftId: id,
          shiftTitle: shift.title,
          reason: payload.reason,
        },
      },
    });

    // Create notification for manager/admin
    const shiftCreator = await prisma.user.findUnique({
      where: { id: shift.createdBy },
    });

    if (shiftCreator) {
      await prisma.notification.create({
        data: {
          type: "SHIFT_CANCELLED",
          message: `Employee declined shift: ${shift.title}. Reason: ${payload.reason}`,
          recipientId: shift.createdBy,
          shiftId: id,
          metadata: {
            shiftId: id,
            shiftTitle: shift.title,
            declinedBy: actor.id,
            reason: payload.reason,
          },
        },
      });
    }

    return jsonResponse({ 
      success: true, 
      message: "Shift assignment declined and removed" 
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

