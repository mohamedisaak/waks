export type AppStatus =
  | "pending"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "hired";

export const STATUS_META: Record<
  AppStatus,
  { label: string; className: string; hint: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-slate-100 text-slate-500",
    hint: "Your application has been received and is awaiting review.",
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-blue-50 text-blue-600",
    hint: "The employer has reviewed your application.",
  },
  shortlisted: {
    label: "Shortlisted",
    className: "bg-purple-50 text-purple-600",
    hint: "You were shortlisted — great news! Expect to hear from them soon.",
  },
  rejected: {
    label: "Not selected",
    className: "bg-red-50 text-red-500",
    hint: "The employer decided not to move forward with your application.",
  },
  hired: {
    label: "Hired",
    className: "bg-green-50 text-green-600",
    hint: "Congratulations — you got the job!",
  },
};

export type StatusTimelineStep = {
  at: number;
  from: AppStatus | null;
  to: AppStatus;
};

export type ApplicationDisplayFields = {
  _id: string;
  _creationTime: number;
  status: string;
  scheduledInterviewAt?: number;
  employerSeenAt?: number;
  statusTimeline?: StatusTimelineStep[];
};

export function timeAgo(ms: number, nowMs: number): string {
  const diff = nowMs - ms;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function timelineStatusLabel(status: AppStatus | "null"): string {
  if (status === "null") return "Start";
  return STATUS_META[status].label;
}

export function formatInterviewDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatShortDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getLastActivity(
  app: ApplicationDisplayFields
): { label: string; at: number } | null {
  if (typeof app.scheduledInterviewAt === "number") {
    return {
      label: `Interview ${formatInterviewDate(app.scheduledInterviewAt)}`,
      at: app.scheduledInterviewAt,
    };
  }

  const timeline = app.statusTimeline;
  if (timeline && timeline.length > 0) {
    const latest = timeline[timeline.length - 1];
    const toLabel = STATUS_META[latest.to as AppStatus]?.label ?? latest.to;
    return {
      label: `Status → ${toLabel}`,
      at: latest.at,
    };
  }

  if (typeof app.employerSeenAt === "number") {
    return {
      label: "Employer viewed application",
      at: app.employerSeenAt,
    };
  }

  return null;
}

export function sortApplicationsWithUnreadFirst<
  T extends ApplicationDisplayFields,
>(applications: T[], unreadByApplicationId: Map<string, number>): T[] {
  return [...applications].sort((a, b) => {
    const aUnread = unreadByApplicationId.get(a._id) ?? 0;
    const bUnread = unreadByApplicationId.get(b._id) ?? 0;
    if (aUnread > 0 && bUnread === 0) return -1;
    if (bUnread > 0 && aUnread === 0) return 1;
    return b._creationTime - a._creationTime;
  });
}

export const MY_APPLICATIONS_VIEW_KEY = "my-applications-view";

export type ApplicationsViewMode = "cards" | "table";

export function readApplicationsViewMode(): ApplicationsViewMode {
  if (typeof window === "undefined") return "cards";
  const stored = localStorage.getItem(MY_APPLICATIONS_VIEW_KEY);
  return stored === "table" ? "table" : "cards";
}
