import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
  applicationNotificationEventValidator,
  channelsForEvent,
  type ApplicationNotificationEvent,
  type ApplicationNotificationPayload,
  type NotificationChannel,
} from "../lib/notificationTypes";
import { buildInAppNotification } from "./emailTemplates";

type ApplicationContext = {
  applicationId: Id<"applications">;
  applicantName: string;
  applicantEmail: string;
  tokenIdentifier?: string;
  phone?: string;
  jobTitle: string;
  companyName: string;
};

async function loadApplicationContext(
  ctx: MutationCtx,
  applicationId: Id<"applications">
): Promise<ApplicationContext | null> {
  const application = await ctx.db.get(applicationId);
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
  };
}

async function hasExistingOutbox(
  ctx: MutationCtx,
  dedupeKey: string
): Promise<boolean> {
  const existing = await ctx.db
    .query("notificationOutbox")
    .withIndex("by_dedupe", (q) => q.eq("dedupeKey", dedupeKey))
    .first();

  if (!existing) return false;
  if (existing.status === "pending" || existing.status === "processing") {
    return true;
  }
  if (existing.status === "sent") return true;
  return false;
}

async function insertOutboxRow(
  ctx: MutationCtx,
  params: {
    applicationId?: Id<"applications">;
    dedupeKey: string;
    eventType: ApplicationNotificationEvent;
    channel: NotificationChannel;
    payload: ApplicationNotificationPayload;
    scheduledFor?: number;
  }
) {
  const exists = await hasExistingOutbox(ctx, params.dedupeKey);
  if (exists) return;

  await ctx.db.insert("notificationOutbox", {
    applicationId: params.applicationId,
    dedupeKey: params.dedupeKey,
    eventType: params.eventType,
    channel: params.channel,
    payload: JSON.stringify(params.payload),
    status: "pending",
    attempts: 0,
    scheduledFor: params.scheduledFor ?? Date.now(),
    createdAt: Date.now(),
  });
}

async function markStaleInterviewNotificationsRead(
  ctx: MutationCtx,
  params: {
    tokenIdentifier: string;
    applicationId: Id<"applications">;
  }
) {
  const existing = await ctx.db
    .query("jobSeekerNotifications")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", params.tokenIdentifier)
    )
    .filter((q) =>
      q.and(
        q.eq(q.field("read"), false),
        q.eq(q.field("applicationId"), params.applicationId),
        q.eq(q.field("kind"), "application")
      )
    )
    .collect();

  for (const row of existing) {
    if (row.title !== "Interview scheduled") continue;
    await ctx.db.patch(row._id, { read: true });
  }
}

async function createInAppNotification(
  ctx: MutationCtx,
  params: {
    tokenIdentifier: string;
    applicationId: Id<"applications">;
    eventType: ApplicationNotificationEvent;
    payload: ApplicationNotificationPayload;
  }
) {
  if (params.eventType === "interview_scheduled") {
    await markStaleInterviewNotificationsRead(ctx, {
      tokenIdentifier: params.tokenIdentifier,
      applicationId: params.applicationId,
    });
  }

  const { title, body } = buildInAppNotification(params.eventType, {
    jobTitle: params.payload.jobTitle,
    companyName: params.payload.companyName,
    scheduledInterviewAt: params.payload.scheduledInterviewAt,
  });

  await ctx.db.insert("jobSeekerNotifications", {
    tokenIdentifier: params.tokenIdentifier,
    title,
    body,
    kind: "application",
    applicationId: params.applicationId,
    linkPath: "/my-applications",
    read: false,
  });
}

export async function enqueueApplicationNotificationHandler(
  ctx: MutationCtx,
  args: {
    applicationId: Id<"applications">;
    eventType: ApplicationNotificationEvent;
    extraDedupe?: string;
    scheduledFor?: number;
    payloadOverrides?: Partial<ApplicationNotificationPayload>;
  }
) {
  const context = await loadApplicationContext(ctx, args.applicationId);
  if (!context) return;

  const payload: ApplicationNotificationPayload = {
    applicantName: context.applicantName,
    applicantEmail: context.applicantEmail,
    jobTitle: context.jobTitle,
    companyName: context.companyName,
    applicationId: context.applicationId,
    tokenIdentifier: context.tokenIdentifier,
    phone: context.phone,
    ...args.payloadOverrides,
  };

  const channels = channelsForEvent(args.eventType);
  const dedupeSuffix = args.extraDedupe ?? "";

  for (const channel of channels) {
    const dedupeKey = `${args.applicationId}:${args.eventType}:${channel}${dedupeSuffix}`;

    if (channel === "in_app") {
      if (!context.tokenIdentifier) continue;
      const inAppDedupe = `${dedupeKey}:in_app_row`;
      const exists = await hasExistingOutbox(ctx, inAppDedupe);
      if (exists) continue;

      await createInAppNotification(ctx, {
        tokenIdentifier: context.tokenIdentifier,
        applicationId: args.applicationId,
        eventType: args.eventType,
        payload,
      });

      await ctx.db.insert("notificationOutbox", {
        applicationId: args.applicationId,
        dedupeKey: inAppDedupe,
        eventType: args.eventType,
        channel: "in_app",
        payload: JSON.stringify(payload),
        status: "sent",
        attempts: 0,
        scheduledFor: Date.now(),
        createdAt: Date.now(),
        sentAt: Date.now(),
      });
      continue;
    }

    await insertOutboxRow(ctx, {
      applicationId: args.applicationId,
      dedupeKey,
      eventType: args.eventType,
      channel,
      payload,
      scheduledFor: args.scheduledFor,
    });
  }

  await ctx.scheduler.runAfter(
    0,
    internal.notifications.delivery.processPending,
    { limit: 25 }
  );
}

export const enqueueForApplication = internalMutation({
  args: {
    applicationId: v.id("applications"),
    eventType: applicationNotificationEventValidator,
    extraDedupe: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    payloadOverrides: v.optional(
      v.object({
        scheduledInterviewAt: v.optional(v.number()),
        mentionNoteBody: v.optional(v.string()),
        mentionAuthorName: v.optional(v.string()),
        mentionTargetEmail: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await enqueueApplicationNotificationHandler(ctx, {
      applicationId: args.applicationId,
      eventType: args.eventType,
      extraDedupe: args.extraDedupe,
      scheduledFor: args.scheduledFor,
      payloadOverrides: args.payloadOverrides,
    });
    return null;
  },
});

export const enqueueNoteMention = internalMutation({
  args: {
    applicationId: v.id("applications"),
    targetEmail: v.string(),
    mentionAuthorName: v.string(),
    mentionNoteBody: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await loadApplicationContext(ctx, args.applicationId);
    if (!context) return null;

    const email = args.targetEmail.trim().toLowerCase();
    const dedupeKey = `${args.applicationId}:note_mention:email:${email}:${Date.now()}`;

    const payload: ApplicationNotificationPayload = {
      applicantName: "",
      applicantEmail: email,
      jobTitle: context.jobTitle,
      companyName: context.companyName,
      applicationId: context.applicationId,
      mentionNoteBody: args.mentionNoteBody,
      mentionAuthorName: args.mentionAuthorName,
      mentionTargetEmail: email,
    };

    await ctx.db.insert("notificationOutbox", {
      applicationId: args.applicationId,
      dedupeKey,
      eventType: "note_mention",
      channel: "email",
      payload: JSON.stringify(payload),
      status: "pending",
      attempts: 0,
      scheduledFor: Date.now(),
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.delivery.processPending,
      { limit: 10 }
    );

    return null;
  },
});
