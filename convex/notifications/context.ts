import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { applicationNotificationEventValidator } from "../lib/notificationTypes";

export const getApplicationContext = internalQuery({
  args: { applicationId: v.id("applications") },
  returns: v.union(
    v.object({
      applicationId: v.id("applications"),
      applicantName: v.string(),
      applicantEmail: v.string(),
      tokenIdentifier: v.optional(v.string()),
      phone: v.optional(v.string()),
      jobTitle: v.string(),
      companyName: v.string(),
      clerkOrgId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) return null;

    const job = await ctx.db.get(application.jobPostingId);
    if (!job) return null;

    const org = await ctx.db.get(job.orgId);

    return {
      applicationId: application._id,
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      tokenIdentifier: application.tokenIdentifier,
      phone: application.phone,
      jobTitle: job.title,
      companyName: org?.name ?? "",
      clerkOrgId: job.clerkOrgId,
    };
  },
});

export const getOutboxRow = internalQuery({
  args: { outboxId: v.id("notificationOutbox") },
  returns: v.union(
    v.object({
      _id: v.id("notificationOutbox"),
      applicationId: v.optional(v.id("applications")),
      dedupeKey: v.string(),
      eventType: applicationNotificationEventValidator,
      channel: v.union(
        v.literal("email"),
        v.literal("whatsapp"),
        v.literal("in_app")
      ),
      payload: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("sent"),
        v.literal("failed"),
        v.literal("skipped")
      ),
      attempts: v.number(),
      scheduledFor: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outboxId);
    if (!row) return null;
    return {
      _id: row._id,
      applicationId: row.applicationId,
      dedupeKey: row.dedupeKey,
      eventType: row.eventType,
      channel: row.channel,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      scheduledFor: row.scheduledFor,
    };
  },
});

export const listPendingOutbox = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.id("notificationOutbox")),
  handler: async (ctx, args) => {
    const cap = Math.min(Math.max(args.limit, 1), 50);
    const now = Date.now();

    const rows = await ctx.db
      .query("notificationOutbox")
      .withIndex("by_status_and_scheduled", (q) =>
        q.eq("status", "pending")
      )
      .order("asc")
      .take(cap * 3);

    const due = rows
      .filter((r) => r.scheduledFor <= now)
      .slice(0, cap);

    return due.map((r) => r._id);
  },
});

export const getPreferencesByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(
    v.object({
      emailEnabled: v.boolean(),
      emailUnsubscribedAt: v.optional(v.number()),
      whatsappOptIn: v.boolean(),
      whatsappPhone: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();

    if (!row) {
      return {
        emailEnabled: true,
        whatsappOptIn: false,
      };
    }

    return {
      emailEnabled: row.emailEnabled,
      emailUnsubscribedAt: row.emailUnsubscribedAt,
      whatsappOptIn: row.whatsappOptIn,
      whatsappPhone: row.whatsappPhone,
    };
  },
});
