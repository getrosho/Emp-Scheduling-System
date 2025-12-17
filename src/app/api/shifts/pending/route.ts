import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role, AssignmentStatus } from "@/generated/prisma/enums";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";

/**
 * GET /api/shifts/pending
 * Get pending shifts for the current employee (shifts assigned but not confirmed)
 */
export async function GET(req: NextRequest) {
  try {
    // Allow employees and managers to view pending shifts (managers are treated as workers)
    const actor = await requireAuth(req, [Role.EMPLOYEE, Role.MANAGER]);
    
    // Get user to find email
    const user = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { email: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Find employee by email
    const employee = await prisma.employee.findFirst({
      where: { email: user.email },
    });

    if (!employee) {
      throw new AppError("Employee record not found", 404);
    }

    // Get pending assignments for this employee
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        userId: actor.id,
        status: AssignmentStatus.PENDING,
      },
      include: {
        shift: {
          include: {
            object: {
              select: {
                id: true,
                label: true,
                address: true,
                city: true,
                state: true,
                postalCode: true,
                notes: true,
              },
            },
            shiftAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        shift: {
          date: "asc",
        },
      },
    });

    // Filter out past shifts
    const now = new Date();
    const pendingShifts = assignments
      .filter((assignment) => new Date(assignment.shift.date) >= now)
      .map((assignment) => {
        const shift = assignment.shift;
        
        // Get co-workers (all other employees assigned to the same shift)
        const coWorkers = shift.shiftAssignments
          .filter((a) => a.userId !== actor.id) // Exclude current employee
          .map((a) => ({
            id: a.userId,
            name: a.user?.name || "Unknown",
            email: a.user?.email || "",
            status: a.status,
          }));

        return {
          id: shift.id,
          title: shift.title,
          description: shift.description,
          startTime: shift.startTime.toISOString(),
          endTime: shift.endTime.toISOString(),
          date: shift.date.toISOString(),
          object: shift.object ? {
            id: shift.object.id,
            label: shift.object.label,
            address: shift.object.address,
            city: shift.object.city,
            state: shift.object.state,
            postalCode: shift.object.postalCode,
            notes: shift.object.notes,
          } : null,
          objectLabel: shift.objectLabel,
          coWorkers, // Add co-workers list
          assignment: {
            id: assignment.id,
            status: assignment.status,
            createdAt: assignment.createdAt.toISOString(),
          },
        };
      });

    return jsonResponse({ shifts: pendingShifts });
  } catch (error) {
    return handleRouteError(error);
  }
}

