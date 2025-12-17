import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handleRouteError, jsonResponse } from "@/utils/response";
import { AppError } from "@/utils/errors";
import { AssignmentStatus } from "@/generated/prisma/enums";
import { startOfMonth, endOfMonth } from "date-fns";
import { sendEmail } from "@/lib/email/sendEmail";
import { generateAssignmentNotificationEmail } from "@/lib/email/templates";

/**
 * POST /api/notifications/send-email
 * Send email notifications to employees/subcontractors assigned to ORANGE shifts
 * Only sends to recipients of shifts that are in ORANGE state (all allocated, but not all confirmed)
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    
    const body = await req.json();
    const monthParam = body.month; // Optional: YYYY-MM format
    
    let monthStart: Date;
    let monthEnd: Date;
    
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split("-").map(Number);
      monthStart = startOfMonth(new Date(year, month - 1, 1));
      monthEnd = endOfMonth(new Date(year, month - 1, 1));
    } else {
      // Default to current month
      const now = new Date();
      monthStart = startOfMonth(now);
      monthEnd = endOfMonth(now);
    }

    // Get all shifts in the month
    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        shiftAssignments: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        subcontractorDemands: {
          include: {
            subcontractor: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Filter to only ORANGE shifts (all required workers allocated, but not all confirmed)
    const orangeShifts = shifts.filter((shift) => {
      const requiredWorkers = shift.requiredWorkers || 1;
      const assignments = shift.shiftAssignments || [];
      const subcontractors = shift.subcontractorDemands || [];
      const totalAllocated = assignments.length + subcontractors.length;

      // Must have all required workers allocated
      if (totalAllocated < requiredWorkers) {
        return false; // RED - not orange
      }

      // Check if all are confirmed
      const allConfirmed =
        assignments.every((a) => a.status === AssignmentStatus.ACCEPTED) &&
        subcontractors.every((s) => s.status === AssignmentStatus.ACCEPTED);

      // ORANGE: all allocated but not all confirmed
      return !allConfirmed;
    });

    // Collect unique recipients with their shifts
    // Map: email -> { name, shifts[] }
    const recipientsMap = new Map<string, {
      email: string;
      name: string;
      shifts: Array<{
        title: string;
        date: Date;
        startTime: Date;
        endTime: Date;
        objectLabel?: string;
      }>;
    }>();

    orangeShifts.forEach((shift) => {
      // Add employee assignments
      shift.shiftAssignments.forEach((assignment) => {
        if (assignment.user?.email && assignment.status !== AssignmentStatus.ACCEPTED) {
          const email = assignment.user.email;
          if (!recipientsMap.has(email)) {
            recipientsMap.set(email, {
              email,
              name: assignment.user.name || "Employee",
              shifts: [],
            });
          }
          const recipient = recipientsMap.get(email)!;
          recipient.shifts.push({
            title: shift.title,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            objectLabel: shift.object?.label || shift.objectLabel,
          });
        }
      });

      // Add subcontractor assignments
      shift.subcontractorDemands.forEach((sub) => {
        if (sub.subcontractor?.email && sub.status !== AssignmentStatus.ACCEPTED) {
          const email = sub.subcontractor.email;
          if (!recipientsMap.has(email)) {
            recipientsMap.set(email, {
              email,
              name: sub.subcontractor.name || "Subcontractor",
              shifts: [],
            });
          }
          const recipient = recipientsMap.get(email)!;
          recipient.shifts.push({
            title: shift.title,
            date: shift.date,
            startTime: shift.startTime,
            endTime: shift.endTime,
            objectLabel: shift.object?.label || shift.objectLabel,
          });
        }
      });
    });

    // Send bulk email to all recipients
    const recipients = Array.from(recipientsMap.values());
    const emailResults: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const emailContent = generateAssignmentNotificationEmail(
          recipient.name,
          recipient.shifts
        );

        const result = await sendEmail({
          to: {
            email: recipient.email,
            name: recipient.name,
          },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        emailResults.push({
          email: recipient.email,
          success: result.success,
          error: result.error,
        });

        if (result.success) {
          console.log(`[Assignment Notification] Email sent to ${recipient.email}`);
        } else {
          console.error(`[Assignment Notification] Failed to send to ${recipient.email}:`, result.error);
        }
      } catch (error: any) {
        console.error(`[Assignment Notification] Error sending to ${recipient.email}:`, error);
        emailResults.push({
          email: recipient.email,
          success: false,
          error: error.message || "Unknown error",
        });
      }
    }

    const successCount = emailResults.filter((r) => r.success).length;
    const failureCount = emailResults.filter((r) => !r.success).length;

    return jsonResponse({
      success: successCount > 0,
      message: `Email notifications sent to ${successCount} recipient(s)${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
      recipients: recipients.map((r) => ({
        email: r.email,
        name: r.name,
        shiftsCount: r.shifts.length,
      })),
      emailResults,
      orangeShiftsCount: orangeShifts.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

