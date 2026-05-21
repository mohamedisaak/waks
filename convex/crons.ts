import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "saved-search-digest-daily",
  { hourUTC: 8, minuteUTC: 5 },
  internal.jobAlerts.sweepSavedSearchAlerts,
  { mode: "daily" }
);

crons.weekly(
  "saved-search-digest-weekly",
  {
    dayOfWeek: "monday",
    hourUTC: 9,
    minuteUTC: 10,
  },
  internal.jobAlerts.sweepSavedSearchAlerts,
  { mode: "weekly" }
);

crons.interval(
  "notification-outbox-processor",
  { minutes: 2 },
  internal.notifications.delivery.processPending,
  { limit: 30 }
);

crons.interval(
  "interview-reminders",
  { hours: 1 },
  internal.notifications.reminders.sweepInterviewReminders,
  {}
);

export default crons;
