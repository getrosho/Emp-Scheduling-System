/**
 * Email Templates for Staff Scheduling System
 */

import { generateEmailTemplate } from "./sendEmail";
import { format } from "date-fns";

/**
 * TYPE 1: Availability Reminder Email
 */
export function generateAvailabilityReminderEmail(
  employeeName: string,
  loginUrl: string
): { subject: string; html: string; text: string } {
  const subject = "Reminder: Please Update Your Availability";
  const content = `
    <p>Hello ${employeeName},</p>
    <p>This is a friendly reminder to update your availability for upcoming shifts.</p>
    <p>Please log in to the system and fill in your availability so we can better plan the schedule.</p>
    <p>Thank you for your cooperation!</p>
  `;

  const html = generateEmailTemplate(
    "Availability Reminder",
    content,
    { text: "Log In to Update Availability", url: loginUrl }
  );

  const text = `
Availability Reminder

Hello ${employeeName},

This is a friendly reminder to update your availability for upcoming shifts.

Please log in to the system and fill in your availability so we can better plan the schedule.

Log in here: ${loginUrl}

Thank you for your cooperation!
  `.trim();

  return { subject, html, text };
}

/**
 * TYPE 2: Assignment Notification Email (Orange Dot)
 */
export function generateAssignmentNotificationEmail(
  recipientName: string,
  shifts: Array<{
    title: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    objectLabel?: string;
  }>
): { subject: string; html: string; text: string } {
  const subject = `Action Required: Please Confirm Your Shift${shifts.length > 1 ? "s" : ""}`;
  
  const shiftsList = shifts.map((shift) => `
    <li style="margin-bottom: 15px; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
      <strong>${shift.title}</strong><br>
      <span style="color: #6b7280;">${format(shift.date, "EEEE, MMMM d, yyyy")}</span><br>
      <span style="color: #6b7280;">${format(shift.startTime, "h:mm a")} - ${format(shift.endTime, "h:mm a")}</span>
      ${shift.objectLabel ? `<br><span style="color: #6b7280;">Location: ${shift.objectLabel}</span>` : ""}
    </li>
  `).join("");

  const content = `
    <p>Hello ${recipientName},</p>
    <p>You have been assigned to the following shift${shifts.length > 1 ? "s" : ""} that ${shifts.length > 1 ? "require" : "requires"} confirmation:</p>
    <ul style="list-style: none; padding: 0;">
      ${shiftsList}
    </ul>
    <p><strong>Please log in to confirm or decline your assignment${shifts.length > 1 ? "s" : ""}.</strong></p>
    <p>Your confirmation helps us ensure proper staffing for these shifts.</p>
  `;

  const html = generateEmailTemplate(
    "Shift Confirmation Required",
    content,
    { text: "Confirm My Shifts", url: "/manager/view" }
  );

  const shiftsText = shifts.map((shift) => 
    `- ${shift.title}\n  ${format(shift.date, "EEEE, MMMM d, yyyy")}\n  ${format(shift.startTime, "h:mm a")} - ${format(shift.endTime, "h:mm a")}${shift.objectLabel ? `\n  Location: ${shift.objectLabel}` : ""}`
  ).join("\n\n");

  const text = `
Shift Confirmation Required

Hello ${recipientName},

You have been assigned to the following shift${shifts.length > 1 ? "s" : ""} that ${shifts.length > 1 ? "require" : "requires"} confirmation:

${shiftsText}

Please log in to confirm or decline your assignment${shifts.length > 1 ? "s" : ""}.

Your confirmation helps us ensure proper staffing for these shifts.

Log in here: /manager/view
  `.trim();

  return { subject, html, text };
}

/**
 * TYPE 3: Shift Confirmation Email (Automatic)
 */
export function generateShiftConfirmationEmail(
  employeeName: string,
  shift: {
    title: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    objectLabel?: string;
  }
): { subject: string; html: string; text: string } {
  const subject = "Shift Confirmed Successfully";
  const content = `
    <p>Hello ${employeeName},</p>
    <p>Your shift has been confirmed successfully!</p>
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;"><strong>${shift.title}</strong></p>
      <p style="margin: 5px 0; color: #6b7280;">${format(shift.date, "EEEE, MMMM d, yyyy")}</p>
      <p style="margin: 5px 0; color: #6b7280;">${format(shift.startTime, "h:mm a")} - ${format(shift.endTime, "h:mm a")}</p>
      ${shift.objectLabel ? `<p style="margin: 5px 0; color: #6b7280;">Location: ${shift.objectLabel}</p>` : ""}
    </div>
    <p>Thank you for confirming. We'll see you there!</p>
  `;

  const html = generateEmailTemplate("Shift Confirmed", content);

  const text = `
Shift Confirmed Successfully

Hello ${employeeName},

Your shift has been confirmed successfully!

${shift.title}
${format(shift.date, "EEEE, MMMM d, yyyy")}
${format(shift.startTime, "h:mm a")} - ${format(shift.endTime, "h:mm a")}
${shift.objectLabel ? `Location: ${shift.objectLabel}` : ""}

Thank you for confirming. We'll see you there!
  `.trim();

  return { subject, html, text };
}

/**
 * TYPE 4: Manager Fully Confirmed Notification (Automatic)
 */
export function generateManagerFullyConfirmedEmail(
  managerName: string,
  shift: {
    title: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    objectLabel?: string;
    confirmedWorkers: number;
    requiredWorkers: number;
  }
): { subject: string; html: string; text: string } {
  const subject = `✅ Shift Fully Confirmed: ${shift.title}`;
  const content = `
    <p>Hello ${managerName},</p>
    <p>Great news! The following shift is now fully confirmed:</p>
    <div style="background-color: #d1fae5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #10b981;">
      <p style="margin: 0;"><strong>${shift.title}</strong></p>
      <p style="margin: 5px 0; color: #6b7280;">${format(shift.date, "EEEE, MMMM d, yyyy")}</p>
      <p style="margin: 5px 0; color: #6b7280;">${format(shift.startTime, "h:mm a")} - ${format(shift.endTime, "h:mm a")}</p>
      ${shift.objectLabel ? `<p style="margin: 5px 0; color: #6b7280;">Location: ${shift.objectLabel}</p>` : ""}
      <p style="margin: 10px 0 0 0; color: #059669; font-weight: bold;">
        ✅ ${shift.confirmedWorkers} of ${shift.requiredWorkers} worker${shift.requiredWorkers > 1 ? "s" : ""} confirmed
      </p>
    </div>
    <p>The shift is ready to go!</p>
  `;

  const html = generateEmailTemplate("Shift Fully Confirmed", content);

  const text = `
Shift Fully Confirmed

Hello ${managerName},

Great news! The following shift is now fully confirmed:

${shift.title}
${format(shift.date, "EEEE, MMMM d, yyyy")}
${format(shift.startTime, "h:mm a")} - ${format(shift.endTime, "h:mm a")}
${shift.objectLabel ? `Location: ${shift.objectLabel}` : ""}

✅ ${shift.confirmedWorkers} of ${shift.requiredWorkers} worker${shift.requiredWorkers > 1 ? "s" : ""} confirmed

The shift is ready to go!
  `.trim();

  return { subject, html, text };
}

