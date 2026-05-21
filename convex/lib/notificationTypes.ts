import { v } from "convex/values";

export const applicationNotificationEventValidator = v.union(
  v.literal("application_submitted"),
  v.literal("status_reviewed"),
  v.literal("status_shortlisted"),
  v.literal("status_rejected"),
  v.literal("status_hired"),
  v.literal("employer_viewed"),
  v.literal("interview_scheduled"),
  v.literal("interview_reminder"),
  v.literal("note_mention")
);

export type ApplicationNotificationEvent =
  | "application_submitted"
  | "status_reviewed"
  | "status_shortlisted"
  | "status_rejected"
  | "status_hired"
  | "employer_viewed"
  | "interview_scheduled"
  | "interview_reminder"
  | "note_mention";

/** Events triggered from application lifecycle (not staff mentions). */
export type ApplicantNotificationEvent = Exclude<
  ApplicationNotificationEvent,
  "note_mention"
>;

export type NotificationChannel = "email" | "whatsapp" | "in_app";

export type ApplicationNotificationPayload = {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  applicationId: string;
  tokenIdentifier?: string;
  phone?: string;
  scheduledInterviewAt?: number;
  mentionNoteBody?: string;
  mentionAuthorName?: string;
  mentionTargetEmail?: string;
};

export function statusToEventType(
  status: "reviewed" | "shortlisted" | "rejected" | "hired"
): ApplicantNotificationEvent {
  switch (status) {
    case "reviewed":
      return "status_reviewed";
    case "shortlisted":
      return "status_shortlisted";
    case "rejected":
      return "status_rejected";
    case "hired":
      return "status_hired";
  }
}

export function channelsForEvent(
  eventType: ApplicationNotificationEvent
): NotificationChannel[] {
  switch (eventType) {
    case "application_submitted":
      return ["email", "in_app"];
    case "status_reviewed":
      return ["email", "in_app"];
    case "status_shortlisted":
      return ["email", "whatsapp", "in_app"];
    case "status_rejected":
      return ["email", "in_app"];
    case "status_hired":
      return ["email", "whatsapp", "in_app"];
    case "employer_viewed":
      return ["email", "in_app"];
    case "interview_scheduled":
      return ["email", "whatsapp", "in_app"];
    case "interview_reminder":
      return ["email", "whatsapp", "in_app"];
    case "note_mention":
      return ["email"];
  }
}

export function parseMentionedEmails(body: string): string[] {
  const matches = body.match(/@[\w.+-]+@[\w.-]+\.\w+/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
