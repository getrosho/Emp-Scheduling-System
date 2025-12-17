import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";
import { sendEmail } from "@/lib/email/sendEmail";
import { generateAvailabilityReminderEmail } from "@/lib/email/templates";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/employees/[id]/send-availability-reminder
 * Send email reminder to employee to fill their availability
 * RBAC: Manager, Admin
 * 
 * TYPE 1: Availability Reminder Email
 * - Manual trigger from Employees → Availability View
 * - Sends to ONE user
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(req, [Role.MANAGER, Role.ADMIN]);
    const { id } = await params;

    if (!id) {
      throw new AppError("Employee ID is required", 400);
    }

    // Get employee
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    if (!employee.email) {
      throw new AppError("Employee email not found", 400);
    }

    // Generate login URL (assuming locale is German by default, can be made dynamic)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    const loginUrl = `${baseUrl}/de/manager/view`; // Manager view for employees to set availability

    // Generate email content
    const emailContent = generateAvailabilityReminderEmail(
      employee.fullName,
      loginUrl
    );

    // Send email
    const emailResult = await sendEmail({
      to: {
        email: employee.email,
        name: employee.fullName,
      },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!emailResult.success) {
      throw new AppError(
        `Failed to send email: ${emailResult.error || "Unknown error"}`,
        500
      );
    }

    // Create notification record for tracking
    try {
      // Find user by email to create notification
      const user = await prisma.user.findUnique({
        where: { email: employee.email },
        select: { id: true },
      });

      if (user) {
        await prisma.notification.create({
          data: {
            type: "AVAILABILITY_REMINDER",
            message: "Please update your availability for upcoming shifts.",
            recipientId: user.id,
            metadata: {
              emailSent: true,
              emailMessageId: emailResult.messageId,
            },
          },
        });
      }
    } catch (notifError) {
      // Don't fail the request if notification creation fails
      console.warn("[Availability Reminder] Failed to create notification:", notifError);
    }

    // Log the action
    console.log(`[Availability Reminder] Email sent to ${employee.email} by ${actor.id}`);

    return jsonResponse({
      success: true,
      message: `Reminder email sent to ${employee.email}`,
      emailResult: {
        messageId: emailResult.messageId,
        recipients: emailResult.recipients,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

