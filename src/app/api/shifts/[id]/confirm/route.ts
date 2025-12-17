import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { confirmShiftSchema } from "@/lib/validations/shift-confirmation";
import { Role, AssignmentStatus } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { assertNoEmployeeConflicts } from "@/utils/shifts";
import { sendEmail } from "@/lib/email/sendEmail";
import { generateShiftConfirmationEmail, generateManagerFullyConfirmedEmail } from "@/lib/email/templates";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/shifts/[id]/confirm
 * Confirm a shift assignment (Employee only)
 * Status: ASSIGNED (PENDING) → CONFIRMED (ACCEPTED)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Allow employees and managers to confirm shifts (managers are treated as workers)
    const actor = await requireAuth(req, [Role.EMPLOYEE, Role.MANAGER]);
    const { id } = await params;
    const body = await req.json();
    const payload = confirmShiftSchema.parse(body);

    if (!id) {
      throw new AppError("Shift ID is required", 400);
    }

    // Get shift with relations
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        object: true,
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
      throw new AppError("Shift is already confirmed", 400);
    }

    if (assignment.status === AssignmentStatus.DECLINED) {
      throw new AppError("Cannot confirm a declined shift", 400);
    }

    // Get user to find email
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { email: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Get employee record to check preferred objects
    const employee = await prisma.employee.findFirst({
      where: { email: user.email },
      include: {
        preferredObjects: true,
      },
    });

    if (!employee) {
      throw new AppError("Employee record not found", 404);
    }

    // Validate: Employee cannot confirm if object is not in preferredObjects
    if (shift.objectId && employee.preferredObjects.length > 0) {
      const hasPreferredObject = employee.preferredObjects.some((obj) => obj.id === shift.objectId);
      if (!hasPreferredObject) {
        throw new AppError(
          "Cannot confirm shift: The shift's object is not in your preferred objects list",
          403
        );
      }
    }

    // Validate: Check for overlapping confirmed shifts
    const overlappingAssignments = await prisma.shiftAssignment.findMany({
      where: {
        userId: actor.id,
        status: AssignmentStatus.ACCEPTED,
        shift: {
          startTime: { lt: shift.endTime },
          endTime: { gt: shift.startTime },
          id: { not: id },
        },
      },
      include: {
        shift: true,
      },
    });

    if (overlappingAssignments.length > 0) {
      throw new AppError(
        `Cannot confirm shift: You have a confirmed shift that overlaps with this one (${overlappingAssignments[0].shift.title})`,
        409
      );
    }

    // Update assignment to ACCEPTED
    const updated = await prisma.shiftAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.ACCEPTED,
        acceptedAt: new Date(),
        note: payload.note,
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
            object: {
              select: {
                id: true,
                label: true,
              },
            },
          },
        },
      },
    });

    // TYPE 3: Send confirmation email to the confirming worker
    try {
      const emailContent = generateShiftConfirmationEmail(
        updated.user.name || "Employee",
        {
          title: shift.title,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          objectLabel: shift.object?.label,
        }
      );

      await sendEmail({
        to: {
          email: updated.user.email,
          name: updated.user.name,
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`[Shift Confirmation] Confirmation email sent to ${updated.user.email}`);
    } catch (emailError: any) {
      // Don't fail the confirmation if email fails
      console.error("[Shift Confirmation] Failed to send confirmation email:", emailError);
    }

    // Check if all assignments are confirmed, update shift status
    const allAssignments = await prisma.shiftAssignment.findMany({
      where: { shiftId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Also check subcontractor assignments
    const allSubcontractorAssignments = await prisma.subcontractorAssignment.findMany({
      where: { shiftId: id },
    });

    const allConfirmed = 
      allAssignments.every((a) => a.status === AssignmentStatus.ACCEPTED) &&
      allSubcontractorAssignments.every((s) => s.status === AssignmentStatus.ACCEPTED);
    const hasAssignments = allAssignments.length > 0 || allSubcontractorAssignments.length > 0;

    let shiftTurnedGreen = false;
    if (allConfirmed && hasAssignments) {
      await prisma.shift.update({
        where: { id },
        data: {
          status: "CONFIRMED" as any,
        },
      });
      shiftTurnedGreen = true;

      // TYPE 4: Send notification to manager when shift turns GREEN
      try {
        // Get the manager who created the shift
        const shiftCreator = await prisma.user.findUnique({
          where: { id: shift.createdBy },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        });

        // Only send to managers/admins
        if (shiftCreator && (shiftCreator.role === Role.MANAGER || shiftCreator.role === Role.ADMIN)) {
          const emailContent = generateManagerFullyConfirmedEmail(
            shiftCreator.name,
            {
              title: shift.title,
              date: shift.date,
              startTime: shift.startTime,
              endTime: shift.endTime,
              objectLabel: shift.object?.label,
              confirmedWorkers: allAssignments.length + allSubcontractorAssignments.length,
              requiredWorkers: shift.requiredWorkers || 1,
            }
          );

          await sendEmail({
            to: {
              email: shiftCreator.email,
              name: shiftCreator.name,
            },
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          console.log(`[Shift Confirmation] Manager notification sent to ${shiftCreator.email}`);
        }
      } catch (managerEmailError: any) {
        // Don't fail the confirmation if manager email fails
        console.error("[Shift Confirmation] Failed to send manager notification:", managerEmailError);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CONFIRM_SHIFT",
        entityType: "ShiftAssignment",
        entityId: assignment.id,
        meta: {
          shiftId: id,
          shiftTitle: shift.title,
          shiftTurnedGreen,
        },
      },
    });

    return jsonResponse({ assignment: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

