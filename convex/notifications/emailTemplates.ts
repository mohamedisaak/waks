import type { ApplicationNotificationEvent } from "../lib/notificationTypes";

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

function siteBaseUrl(): string {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.waks.co.ke"
  ).replace(/\/$/, "");
}

function layout(params: {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote?: string;
}): string {
  const { title, bodyHtml, ctaLabel, ctaHref, footerNote } = params;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e8e8e4;overflow:hidden;">
        <tr><td style="padding:24px 28px;background:#4CAF7D;">
          <span style="font-size:18px;font-weight:700;color:#fff;">Waks</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#1a1a18;">${title}</h1>
          ${bodyHtml}
          <p style="margin:24px 0 0;">
            <a href="${ctaHref}" style="display:inline-block;background:#4CAF7D;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;">${ctaLabel}</a>
          </p>
          ${footerNote ? `<p style="margin:24px 0 0;font-size:12px;color:#888;line-height:1.5;">${footerNote}</p>` : ""}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#999;">You received this because you applied on Waks.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildApplicationEmail(
  eventType: ApplicationNotificationEvent,
  payload: {
    applicantName: string;
    jobTitle: string;
    companyName: string;
    applicationId: string;
    scheduledInterviewAt?: number;
    mentionNoteBody?: string;
    mentionAuthorName?: string;
  }
): EmailContent {
  const base = siteBaseUrl();
  const myAppsUrl = `${base}/my-applications`;
  const name = payload.applicantName || "there";
  const role = payload.jobTitle;
  const company = payload.companyName || "the employer";

  const interviewWhen =
    payload.scheduledInterviewAt !== undefined
      ? new Date(payload.scheduledInterviewAt).toLocaleString("en-KE", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Africa/Nairobi",
        })
      : "";

  switch (eventType) {
    case "application_submitted":
      return {
        subject: `Application received: ${role}`,
        text: `Hi ${name},\n\nWe received your application for ${role} at ${company}.\n\nTrack your application: ${myAppsUrl}`,
        html: layout({
          title: "Application received",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;">Your application for <strong>${role}</strong> at <strong>${company}</strong> was submitted successfully. We'll notify you when the employer updates your status.</p>`,
          ctaLabel: "View my applications",
          ctaHref: myAppsUrl,
        }),
      };
    case "status_reviewed":
      return {
        subject: `Update: ${role} — under review`,
        text: `Hi ${name},\n\n${company} has reviewed your application for ${role}.\n\n${myAppsUrl}`,
        html: layout({
          title: "Application reviewed",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;"><strong>${company}</strong> has reviewed your application for <strong>${role}</strong>.</p>`,
          ctaLabel: "View application",
          ctaHref: myAppsUrl,
        }),
      };
    case "status_shortlisted":
      return {
        subject: `Shortlisted: ${role} at ${company}`,
        text: `Hi ${name},\n\nGreat news — you were shortlisted for ${role} at ${company}.\n\n${myAppsUrl}`,
        html: layout({
          title: "You've been shortlisted",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;">Congratulations — <strong>${company}</strong> shortlisted you for <strong>${role}</strong>. They may contact you about next steps soon.</p>`,
          ctaLabel: "View application",
          ctaHref: myAppsUrl,
        }),
      };
    case "status_rejected":
      return {
        subject: `Update: ${role} at ${company}`,
        text: `Hi ${name},\n\nThank you for applying to ${role} at ${company}. They decided not to move forward at this time.\n\n${myAppsUrl}`,
        html: layout({
          title: "Application update",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;">Thank you for applying to <strong>${role}</strong> at <strong>${company}</strong>. They have decided not to move forward with your application at this time.</p>`,
          ctaLabel: "Browse more jobs",
          ctaHref: `${base}/jobs`,
        }),
      };
    case "status_hired":
      return {
        subject: `Hired: ${role} at ${company}`,
        text: `Hi ${name},\n\nCongratulations — you were marked as hired for ${role} at ${company}!\n\n${myAppsUrl}`,
        html: layout({
          title: "Congratulations!",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;"><strong>${company}</strong> marked you as <strong>hired</strong> for <strong>${role}</strong>. Congratulations!</p>`,
          ctaLabel: "View application",
          ctaHref: myAppsUrl,
        }),
      };
    case "employer_viewed":
      return {
        subject: `${company} viewed your application`,
        text: `Hi ${name},\n\n${company} opened your application for ${role}.\n\n${myAppsUrl}`,
        html: layout({
          title: "Employer viewed your application",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;"><strong>${company}</strong> viewed your application for <strong>${role}</strong>.</p>`,
          ctaLabel: "View application",
          ctaHref: myAppsUrl,
        }),
      };
    case "interview_scheduled":
      return {
        subject: `Interview scheduled: ${role}`,
        text: `Hi ${name},\n\n${company} scheduled an interview for ${role} on ${interviewWhen}.\n\n${myAppsUrl}`,
        html: layout({
          title: "Interview scheduled",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;"><strong>${company}</strong> scheduled an interview for <strong>${role}</strong>.</p>
            <p style="color:#444;line-height:1.6;"><strong>When:</strong> ${interviewWhen}</p>`,
          ctaLabel: "View details",
          ctaHref: myAppsUrl,
        }),
      };
    case "interview_reminder":
      return {
        subject: `Reminder: interview tomorrow — ${role}`,
        text: `Hi ${name},\n\nReminder: your interview for ${role} at ${company} is coming up (${interviewWhen}).\n\n${myAppsUrl}`,
        html: layout({
          title: "Interview reminder",
          bodyHtml: `<p style="color:#444;line-height:1.6;">Hi ${name},</p>
            <p style="color:#444;line-height:1.6;">This is a reminder about your upcoming interview for <strong>${role}</strong> at <strong>${company}</strong>.</p>
            <p style="color:#444;line-height:1.6;"><strong>When:</strong> ${interviewWhen}</p>`,
          ctaLabel: "View application",
          ctaHref: myAppsUrl,
        }),
      };
    case "note_mention":
      return {
        subject: `You were mentioned on ${role}`,
        text: `${payload.mentionAuthorName ?? "A teammate"} mentioned you on a candidate note for ${role}.\n\n"${payload.mentionNoteBody ?? ""}"\n\n${base}/dashboard/applications`,
        html: layout({
          title: "You were mentioned",
          bodyHtml: `<p style="color:#444;line-height:1.6;"><strong>${payload.mentionAuthorName ?? "A teammate"}</strong> mentioned you on a note for <strong>${role}</strong> (${company}).</p>
            <blockquote style="margin:16px 0;padding:12px 16px;background:#f7f7f5;border-left:3px solid #4CAF7D;color:#444;">${(payload.mentionNoteBody ?? "").replace(/</g, "&lt;")}</blockquote>`,
          ctaLabel: "Open applications",
          ctaHref: `${base}/dashboard/applications`,
        }),
      };
  }
}

export function buildInAppNotification(
  eventType: ApplicationNotificationEvent,
  payload: {
    jobTitle: string;
    companyName: string;
    scheduledInterviewAt?: number;
  }
): { title: string; body: string } {
  const role = payload.jobTitle;
  const company = payload.companyName || "Employer";
  const interviewWhen =
    payload.scheduledInterviewAt !== undefined
      ? new Date(payload.scheduledInterviewAt).toLocaleString("en-KE", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Africa/Nairobi",
        })
      : "";

  switch (eventType) {
    case "application_submitted":
      return {
        title: "Application submitted",
        body: `Your application for ${role} at ${company} was received.`,
      };
    case "status_reviewed":
      return {
        title: "Application reviewed",
        body: `${company} reviewed your application for ${role}.`,
      };
    case "status_shortlisted":
      return {
        title: "Shortlisted",
        body: `You were shortlisted for ${role} at ${company}.`,
      };
    case "status_rejected":
      return {
        title: "Application update",
        body: `${company} is not moving forward with your application for ${role}.`,
      };
    case "status_hired":
      return {
        title: "Hired",
        body: `Congratulations — hired for ${role} at ${company}!`,
      };
    case "employer_viewed":
      return {
        title: "Application viewed",
        body: `${company} viewed your application for ${role}.`,
      };
    case "interview_scheduled":
      return {
        title: "Interview scheduled",
        body: `Interview for ${role} at ${company}${interviewWhen ? ` on ${interviewWhen}` : ""}.`,
      };
    case "interview_reminder":
      return {
        title: "Interview reminder",
        body: `Upcoming interview for ${role} at ${company}${interviewWhen ? ` — ${interviewWhen}` : ""}.`,
      };
    case "note_mention":
      return { title: "Mention", body: `You were mentioned on ${role}.` };
  }
}

export function buildWhatsAppBody(
  eventType: ApplicationNotificationEvent,
  payload: {
    applicantName: string;
    jobTitle: string;
    companyName: string;
    scheduledInterviewAt?: number;
  }
): string | null {
  const name = payload.applicantName || "there";
  const role = payload.jobTitle;
  const company = payload.companyName || "the employer";
  const interviewWhen =
    payload.scheduledInterviewAt !== undefined
      ? new Date(payload.scheduledInterviewAt).toLocaleString("en-KE", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Africa/Nairobi",
        })
      : "";

  switch (eventType) {
    case "status_shortlisted":
      return `Hi ${name}, great news! You were shortlisted for ${role} at ${company}. Check Waks for details.`;
    case "status_hired":
      return `Hi ${name}, congratulations! You were marked as hired for ${role} at ${company}.`;
    case "interview_scheduled":
      return `Hi ${name}, ${company} scheduled an interview for ${role} on ${interviewWhen}. See Waks for details.`;
    case "interview_reminder":
      return `Reminder: your interview for ${role} at ${company} is coming up (${interviewWhen}).`;
    default:
      return null;
  }
}
