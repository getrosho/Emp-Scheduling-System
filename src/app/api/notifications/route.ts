import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { createNotificationSchema, markNotificationSchema } from "@/lib/validations";
import { handleRouteError, jsonResponse } from "@/utils/response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: user.id,
        read: unreadOnly ? false : undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ notifications });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const payload = createNotificationSchema.parse(await req.json());

    // Convert metadata to Prisma-compatible JSON format
    // Prisma expects InputJsonValue for JSON fields
    const notificationData: {
      recipientId: string;
      message: string;
      type: string;
      shiftId?: string;
      metadata?: unknown;
    } = {
      recipientId: payload.recipientId,
      message: payload.message,
      type: payload.type,
    };
    
    if (payload.shiftId) {
      notificationData.shiftId = payload.shiftId;
    }
    
    if (payload.metadata) {
      notificationData.metadata = payload.metadata;
    }

    const notification = await prisma.notification.create({ data: notificationData as any });
    return jsonResponse({ notification }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const payload = markNotificationSchema.parse(await req.json());

    const result = await prisma.notification.updateMany({
      where: { id: { in: payload.notificationIds }, recipientId: user.id },
      data: { read: true },
    });

    return jsonResponse({ updated: result.count });
  } catch (error) {
    return handleRouteError(error);
  }
}

