import { prisma } from "@/lib/db";
import { ShiftStatus } from "@/generated/prisma/enums";
import { AppError } from "./errors";

export async function assertNoEmployeeConflicts(
  userIds: string[],
  startTime: Date,
  endTime: Date,
  excludeShiftId?: string,
) {
  if (!userIds.length) {
    return;
  }

  const conflict = await prisma.shiftAssignment.findFirst({
    where: {
      userId: { in: userIds },
      shift: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
        id: excludeShiftId ? { not: excludeShiftId } : undefined,
      },
    },
    include: { shift: true },
  });

  if (conflict) {
    throw new AppError(
      `Employee already assigned to overlapping shift ${conflict.shift.title}`,
      409,
    );
  }
}

export async function recalculateShiftStatus(shiftId: string) {
  const assignments = await prisma.shiftAssignment.findMany({
    where: { shiftId },
  });

  if (!assignments.length) {
    return prisma.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.PUBLISHED },
    });
  }

  const allAccepted = assignments.every((assignment) => assignment.status === "ACCEPTED");
  const anyDeclined = assignments.some((assignment) => assignment.status === "DECLINED");

  if (allAccepted) {
    return prisma.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.CONFIRMED },
    });
  }

  if (anyDeclined) {
    return prisma.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.NEED_REALLOCATION },
    });
  }

  return prisma.shift.update({
    where: { id: shiftId },
    data: { status: ShiftStatus.PUBLISHED },
  });
}

