import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const REMINDER_TOLERANCE_MS = 60 * 60 * 1000;

export const sweepInterviewReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const targetStart = now + REMINDER_WINDOW_MS - REMINDER_TOLERANCE_MS;
    const targetEnd = now + REMINDER_WINDOW_MS + REMINDER_TOLERANCE_MS;

    const applications = await ctx.db.query("applications").take(500);

    for (const app of applications) {
      if (app.withdrawn) continue;
      if (app.scheduledInterviewAt === undefined) continue;
      if (
        app.scheduledInterviewAt < targetStart ||
        app.scheduledInterviewAt > targetEnd
      ) {
        continue;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.enqueue.enqueueForApplication,
        {
          applicationId: app._id,
          eventType: "interview_reminder",
          extraDedupe: `:reminder:${app.scheduledInterviewAt}`,
          payloadOverrides: {
            scheduledInterviewAt: app.scheduledInterviewAt,
          },
        }
      );
    }

    return null;
  },
});
