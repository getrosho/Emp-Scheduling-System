import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createRecurringSchema, deleteRecurringSchema, expandRecurringSchema } from "@/lib/validations";
import { generateRecurringOccurrences } from "@/utils/date";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const templates = await prisma.recurringShiftTemplate.findMany({
      include: { shifts: true },
    });
    return jsonResponse({ templates });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const payload = createRecurringSchema.parse(await req.json());

    const template = await prisma.recurringShiftTemplate.create({ data: payload });
    return jsonResponse({ template }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAuth(req);
    const payload = expandRecurringSchema.parse(await req.json());

    const template = await prisma.recurringShiftTemplate.findUnique({
      where: { id: payload.templateId },
    });
    if (!template) {
      throw new AppError("Template not found", 404);
    }

    const occurrences = generateRecurringOccurrences(
      {
        rule: template.rule,
        interval: template.interval,
        byWeekday: template.byWeekday,
        startDate: template.startDate,
        endDate: template.endDate ?? undefined,
        shiftDuration: template.shiftDuration,
        baseStartTime: template.baseStartTime,
        timezone: template.timezone,
      },
      payload.rangeStart,
      payload.rangeEnd,
    );

    if (!occurrences.length) {
      return jsonResponse({ shifts: [] });
    }

    const created = await prisma.$transaction(
      occurrences.map((occurrence) =>
        prisma.shift.create({
          data: {
            title: template.name,
            description: template.description,
            startTime: occurrence.startTime,
            endTime: occurrence.endTime,
            date: occurrence.startTime,
            durationMinutes: template.shiftDuration,
            createdBy: actor.id,
            isRecurring: true,
            recurringRule: template.rule,
            recurringTemplateId: template.id,
          },
        }),
      ),
    );

    return jsonResponse({ shifts: created });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(req);
    const payload = deleteRecurringSchema.parse(await req.json());

    await prisma.$transaction([
      payload.cascadeShifts
        ? prisma.shift.deleteMany({
            where: {
              recurringTemplateId: payload.templateId,
            },
          })
        : prisma.shift.updateMany({
            where: { recurringTemplateId: payload.templateId },
            data: { isRecurring: false, recurringTemplateId: null },
          }),
      prisma.recurringShiftTemplate.delete({
        where: { id: payload.templateId },
      }),
    ]);

    return jsonResponse({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

