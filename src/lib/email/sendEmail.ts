/**
 * Centralized Email Service
 * 
 * Supports:
 * - Single recipient emails
 * - Bulk recipient emails
 * - SMTP configuration via environment variables
 * - Safe logging for sent emails
 */

type EmailRecipient = {
  email: string;
  name?: string;
};

type EmailOptions = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  from?: {
    email: string;
    name?: string;
  };
};

type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
  recipients: string[];
};

/**
 * Send email to single or multiple recipients
 * 
 * Environment variables required:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP username
 * - SMTP_PASSWORD: SMTP password
 * - SMTP_FROM_EMAIL: Default sender email
 * - SMTP_FROM_NAME: Default sender name (optional)
 * 
 * In development, emails are logged to console instead of being sent.
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const recipientEmails = recipients.map((r) => r.email);

  // Get SMTP configuration from environment
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const defaultFromEmail = process.env.SMTP_FROM_EMAIL || "noreply@example.com";
  const defaultFromName = process.env.SMTP_FROM_NAME || "Staff Scheduling System";

  const fromEmail = options.from?.email || defaultFromEmail;
  const fromName = options.from?.name || defaultFromName;

  // In development or if SMTP is not configured, log instead of sending
  const isDevelopment = process.env.NODE_ENV === "development";
  const smtpConfigured = !!(smtpHost && smtpUser && smtpPassword);

  if (isDevelopment || !smtpConfigured) {
    // Safe logging - don't log passwords or sensitive data
    console.log("[Email Service] Email would be sent:", {
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmails,
      subject: options.subject,
      recipientsCount: recipientEmails.length,
      hasHtml: !!options.html,
      hasText: !!options.text,
      smtpConfigured,
      isDevelopment,
    });

    // In development, also log a preview of the email content (first 200 chars)
    if (isDevelopment) {
      const preview = options.html.replace(/<[^>]*>/g, "").substring(0, 200);
      console.log("[Email Service] Email preview:", preview);
    }

    // Return success in development mode (for testing)
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
      recipients: recipientEmails,
    };
  }

  // Production: Actually send email via SMTP
  try {
    // For now, we'll use nodemailer if available, otherwise log
    // In a real implementation, you would use nodemailer or similar
    const nodemailer = await import("nodemailer").catch(() => null);

    if (!nodemailer) {
      console.warn("[Email Service] nodemailer not installed. Email not sent.");
      return {
        success: false,
        error: "Email service not configured. Please install nodemailer.",
        recipients: recipientEmails,
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Send email
    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: recipientEmails.join(", "),
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);

    // Safe logging - don't log sensitive data
    console.log("[Email Service] Email sent successfully:", {
      messageId: info.messageId,
      recipientsCount: recipientEmails.length,
      subject: options.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
      recipients: recipientEmails,
    };
  } catch (error: any) {
    console.error("[Email Service] Failed to send email:", {
      error: error.message,
      recipientsCount: recipientEmails.length,
      subject: options.subject,
    });

    return {
      success: false,
      error: error.message || "Unknown error",
      recipients: recipientEmails,
    };
  }
}

/**
 * Generate email HTML template
 */
export function generateEmailTemplate(
  title: string,
  content: string,
  actionButton?: { text: string; url: string }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${title}</h1>
  </div>
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px;">
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
      ${content}
    </div>
    ${actionButton ? `
    <div style="text-align: center; margin-top: 30px;">
      <a href="${actionButton.url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        ${actionButton.text}
      </a>
    </div>
    ` : ""}
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>This is an automated message from the Staff Scheduling System.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

