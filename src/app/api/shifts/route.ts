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

    let shifts;
    try {
      shifts = await prisma.shift.findMany({
        where: {
          status: filters.status,
          objectId: filters.objectId,
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
          object: true,
        },
      });
    } catch (queryError: any) {
      // If the error is about missing tables/columns, try with minimal includes
      console.error("[Shifts GET] Query error:", queryError);
      console.error("[Shifts GET] Error message:", queryError?.message);
      console.error("[Shifts GET] Error code:", queryError?.code);
      
      if (queryError?.message?.includes("does not exist") || 
          queryError?.message?.includes("not available") ||
          queryError?.code === "P2021" || // Table does not exist
          queryError?.code === "P2025") { // Record not found
        console.warn("[Shifts GET] Database schema may be incomplete. Retrying with minimal includes...");
        try {
          shifts = await prisma.shift.findMany({
            where: {
              status: filters.status,
              objectId: filters.objectId,
              startTime: filters.from ? { gte: filters.from } : undefined,
              endTime: filters.to ? { lte: filters.to } : undefined,
            },
            orderBy: { startTime: "asc" },
          });
          // Add empty arrays for missing relations
          shifts = shifts.map((shift: any) => ({
            ...shift,
            shiftAssignments: [],
            subcontractorDemands: [],
            recurringTemplate: null,
            object: null,
          }));
          console.log("[Shifts GET] Query successful with minimal includes, found", shifts.length, "shifts");
        } catch (retryError: any) {
          console.error("[Shifts GET] Retry also failed:", retryError);
          console.error("[Shifts GET] Retry error message:", retryError?.message);
          console.error("[Shifts GET] Retry error code:", retryError?.code);
          // Return empty array instead of throwing to prevent empty response
          shifts = [];
          console.warn("[Shifts GET] Returning empty shifts array due to database schema issues");
        }
      } else {
        // For other errors, try to return empty array gracefully
        console.error("[Shifts GET] Unexpected error, returning empty array:", queryError);
        shifts = [];
      }
    }

    return jsonResponse({ shifts });
  } catch (error) {
    console.error("[Shifts GET] Outer catch error:", error);
    // Ensure we always return a proper response, never empty
    try {
      return handleRouteError(error);
    } catch (handlerError) {
      console.error("[Shifts GET] Error handler failed:", handlerError);
      // Last resort: return a basic error response
      return jsonResponse(null, {
        status: 500,
        error: new AppError(
          error instanceof Error ? error.message : "Failed to fetch shifts. Please check database connection.",
          500
        ),
      });
    }
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
        objectLabel: payload.objectLabel,
        objectId: payload.objectId,
        skillsRequired: payload.skillsRequired ?? [],
        requiredWorkers: payload.requiredWorkers ?? 1, // Amount of workers needed
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

