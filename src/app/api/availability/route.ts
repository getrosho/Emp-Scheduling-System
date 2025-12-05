import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { availabilityCreateSchema, availabilityUpdateSchema } from "@/lib/validations";
import { availabilityOverlaps } from "@/utils/availability";
import { AppError } from "@/utils/errors";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const day = req.nextUrl.searchParams.get("day") ?? undefined;

    const availability = await prisma.availability.findMany({
      where: {
        userId,
        day: day as any,
      },
      orderBy: [{ userId: "asc" }, { day: "asc" }, { startTime: "asc" }],
    });

    return jsonResponse({ availability });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const payload = availabilityCreateSchema.parse(body);

    const userSlots = await prisma.availability.findMany({
      where: { userId: payload.userId },
    });

    if (availabilityOverlaps(userSlots, payload.day, payload.startTime, payload.endTime)) {
      throw new AppError("Availability overlaps with existing range", 409);
    }

    const created = await prisma.availability.create({ data: payload });
    return jsonResponse({ availability: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = await req.json();
    const payload = availabilityUpdateSchema.parse(body);

    const existing = await prisma.availability.findUnique({
      where: { id: payload.id },
    });
    if (!existing) {
      throw new AppError("Availability not found", 404);
    }

    const userSlots = await prisma.availability.findMany({
      where: { userId: existing.userId, id: { not: payload.id } },
    });

    if (availabilityOverlaps(userSlots, payload.day ?? existing.day, payload.startTime, payload.endTime)) {
      throw new AppError("Availability overlaps with existing range", 409);
    }

    const updated = await prisma.availability.update({
      where: { id: payload.id },
      data: {
        day: payload.day,
        startTime: payload.startTime,
        endTime: payload.endTime,
        timezone: payload.timezone,
      },
    });

    return jsonResponse({ availability: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

