import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { updateShiftSchema } from "@/lib/validations";
import { calculateDurationMinutes } from "@/utils/date";
import { assertNoEmployeeConflicts, recalculateShiftStatus } from "@/utils/shifts";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth(req);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Shift ID is required", 400);
    }

    let shift;
    try {
      shift = await prisma.shift.findUnique({
        where: { id },
        include: {
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
          subcontractorDemands: {
            include: {
              subcontractor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          object: true,
        },
      });
    } catch (queryError: any) {
      // If the error is about missing tables/columns, try with minimal includes
      console.error("[Shifts GET /:id] Query error:", queryError);
      console.error("[Shifts GET /:id] Error message:", queryError?.message);
      console.error("[Shifts GET /:id] Error code:", queryError?.code);
      
      if (queryError?.message?.includes("does not exist") || 
          queryError?.message?.includes("not available") ||
          queryError?.code === "P2021" || // Table does not exist
          queryError?.code === "P2025") { // Record not found
        console.warn("[Shifts GET /:id] Database schema may be incomplete. Retrying with minimal includes...");
        try {
          shift = await prisma.shift.findUnique({
            where: { id },
          });
          // Add empty arrays/objects for missing relations
          if (shift) {
            shift = {
              ...shift,
              shiftAssignments: [],
              subcontractorDemands: [],
              object: null,
            } as any;
          }
          console.log("[Shifts GET /:id] Query successful with minimal includes");
        } catch (retryError: any) {
          console.error("[Shifts GET /:id] Retry also failed:", retryError);
          // Don't throw, let it fall through to check if shift exists
        }
      } else {
        // For other errors, log but continue to check if shift exists
        console.error("[Shifts GET /:id] Unexpected error:", queryError);
      }
    }
    
    if (!shift) {
      throw new AppError("Shift not found", 404);
    }
    return jsonResponse({ shift });
  } catch (error) {
    console.error("[Shifts GET /:id] Outer catch error:", error);
    // Ensure we always return a proper response
    try {
      return handleRouteError(error);
    } catch (handlerError) {
      console.error("[Shifts GET /:id] Error handler failed:", handlerError);
      // Last resort: return a basic error response
      return jsonResponse(null, {
        status: 500,
        error: new AppError(
          error instanceof Error ? error.message : "Failed to fetch shift. Please check database connection.",
          500
        ),
      });
    }
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Only ADMIN can update shifts
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Shift ID is required", 400);
    }

    const body = await req.json();
    const payload = updateShiftSchema.parse(body);

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Shift not found", 404);
    }

    const startTime = payload.startTime ?? existing.startTime;
    const endTime = payload.endTime ?? existing.endTime;
    if (startTime >= endTime) {
      throw new AppError("Shift end time must be after start time", 400);
    }

    const assigned = payload.assignedEmployeeIds ?? existing.assignedEmployees;
    await assertNoEmployeeConflicts(assigned, startTime, endTime, id);

    const durationMinutes = calculateDurationMinutes(startTime, endTime);

    const { assignedEmployeeIds, ...rest } = payload;
    const updated = await prisma.shift.update({
      where: { id },
      data: {
        ...rest,
        durationMinutes,
        startTime,
        endTime,
        assignedEmployees: assigned,
      },
      include: { shiftAssignments: true },
    });

    // Check if assignedEmployeeIds was explicitly provided (including empty array to clear assignments)
    if (payload.assignedEmployeeIds !== undefined) {
      // Delete all existing assignments
      await prisma.shiftAssignment.deleteMany({ where: { shiftId: id } });
      
      // Create new assignments if any provided
      if (assigned.length > 0) {
        await prisma.shiftAssignment.createMany({
          data: assigned.map((userId) => ({ userId, shiftId: id })),
        });
      }
      
      // Recalculate shift status based on new assignments
      await recalculateShiftStatus(id);
    }

    return jsonResponse({ shift: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Only ADMIN can delete shifts
    await requireAuth(req, [Role.ADMIN]);
    const { id } = await params;
    
    if (!id) {
      throw new AppError("Shift ID is required", 400);
    }

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      throw new AppError("Shift not found", 404);
    }

    await prisma.shift.delete({ where: { id } });
    return jsonResponse({ deleted: true, message: "Shift permanently deleted" });
  } catch (error) {
    return handleRouteError(error);
  }
}

