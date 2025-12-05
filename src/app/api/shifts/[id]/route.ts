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

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        shiftAssignments: true,
        subcontractorDemands: true,
        location: true,
      },
    });
    if (!shift) {
      throw new AppError("Shift not found", 404);
    }
    return jsonResponse({ shift });
  } catch (error) {
    return handleRouteError(error);
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

