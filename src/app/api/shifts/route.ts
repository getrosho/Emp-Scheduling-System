import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createShiftSchema, shiftFilterSchema } from "@/lib/validations";
import { calculateDurationMinutes } from "@/utils/date";
import { assertNoEmployeeConflicts } from "@/utils/shifts";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { ShiftStatus, RecurringRule } from "@/generated/prisma/enums";
import { AppError } from "@/utils/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const filters = shiftFilterSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const shifts = await prisma.shift.findMany({
      where: {
        status: filters.status,
        locationId: filters.locationId,
        startTime: filters.from ? { gte: filters.from } : undefined,
        endTime: filters.to ? { lte: filters.to } : undefined,
      },
      orderBy: { startTime: "asc" },
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
        subcontractorDemands: true,
        recurringTemplate: true,
        location: true,
      },
    });

    return jsonResponse({ shifts });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    const body = await req.json();
    console.log("Received shift creation request:", JSON.stringify(body, null, 2));
    
    const payload = createShiftSchema.parse(body);
    console.log("Parsed payload:", JSON.stringify(payload, null, 2));

    if (payload.startTime >= payload.endTime) {
      throw new AppError("Shift end time must be after start time", 400);
    }

    console.log("Checking employee conflicts...");
    await assertNoEmployeeConflicts(payload.assignedEmployeeIds ?? [], payload.startTime, payload.endTime);
    
    console.log("Calculating duration...");
    const durationMinutes = calculateDurationMinutes(payload.startTime, payload.endTime);
    console.log("Duration in minutes:", durationMinutes);

    // If isRecurring is true but no template, treat it as a regular shift
    // Recurring shifts should be created from templates, not directly
    const isRecurring = payload.isRecurring && payload.recurringRule !== RecurringRule.NONE;
    console.log("Is recurring:", isRecurring, "Rule:", payload.recurringRule);
    
    console.log("Creating shift in database...");
    const shift = await prisma.shift.create({
      data: {
        title: payload.title,
        description: payload.description,
        startTime: payload.startTime,
        endTime: payload.endTime,
        date: payload.date,
        durationMinutes,
        locationLabel: payload.locationLabel,
        locationId: payload.locationId,
        skillsRequired: payload.skillsRequired ?? [],
        assignedEmployees: payload.assignedEmployeeIds ?? [],
        createdBy: actor.id,
        status: ShiftStatus.PUBLISHED,
        isRecurring: isRecurring,
        recurringRule: isRecurring ? payload.recurringRule : RecurringRule.NONE,
        colorTag: payload.colorTag,
      },
    });
    console.log("Shift created successfully:", shift.id);

    if (payload.assignedEmployeeIds?.length) {
      await prisma.shiftAssignment.createMany({
        data: payload.assignedEmployeeIds.map((userId) => ({
          userId,
          shiftId: shift.id,
        })),
        skipDuplicates: true,
      });
    }

    return jsonResponse({ shift }, { status: 201 });
  } catch (error) {
    // Log the actual error for debugging
    console.error("Shift creation error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return handleRouteError(error);
  }
}

