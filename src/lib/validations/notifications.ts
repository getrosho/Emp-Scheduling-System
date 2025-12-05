import { z } from "zod";
import { NotificationType } from "@/generated/prisma/enums";

export const createNotificationSchema = z.object({
  recipientId: z.string().cuid(),
  message: z.string().min(2),
  type: z.nativeEnum(NotificationType).default(NotificationType.GENERAL),
  metadata: z.record(z.string(), z.unknown()).optional(),
  shiftId: z.string().cuid().optional(),
});

export const markNotificationSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1),
});

