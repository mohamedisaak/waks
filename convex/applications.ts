import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  canAdvanceToPremiumPipelineStages,
  canUseEmployerNotes,
  canUseInterviewScheduling,
  canUseRecruitingProductivityPack,
  canTrackEmployerApplicationViews,
} from "../lib/orgPlan";
import { resolveOrgAccessTier } from "./lib/employerBillingMode";
import { activeJobEligibleForPublicSite } from "./lib/jobPublicVisibility";
import { throwIfJobSeekerSuspended } from "./lib/jobSeekerAccess";
import {
  parseMentionedEmails,
  statusToEventType,
  type ApplicantNotificationEvent,
} from "./lib/notificationTypes";

type ApplicationStatus = Doc<"applications">["status"];

const applicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("reviewed"),
  v.literal("shortlisted"),
  v.literal("rejected"),
  v.literal("hired")
);

const screeningAnswerValidator = v.object({
  questionId: v.string(),
  answer: v.string(),
});

async function bumpApplicationMetric(
  ctx: MutationCtx,
  jobPostingId: Id<"jobPostings">
) {
  const job = await ctx.db.get(jobPostingId);
  if (!job) return;

  const existing = await ctx.db
    .query("jobMetrics")
    .withIndex("by_job", (q) => q.eq("jobPostingId", jobPostingId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      applicationCount: existing.applicationCount + 1,
    });
    return;
  }

  await ctx.db.insert("jobMetrics", {
    jobPostingId,
    clerkOrgId: job.clerkOrgId,
    viewCount: 0,
    applicationCount: 1,
  });
}

async function appendStatusHistory(
  ctx: MutationCtx,
  applicationId: Id<"applications">,
  fromStatus: ApplicationStatus | undefined,
  toStatus: ApplicationStatus,
  actor?: string | undefined
) {
  await ctx.db.insert("applicationStatusHistory", {
    applicationId,
    fromStatus,
    toStatus,
    actorTokenIdentifier: actor,
  });
}

function validateScreeningAnswers(
  screeningQuestions: NonNullable<Doc<"jobPostings">["screeningQuestions"]>,
  screeningAnswers?: { questionId: string; answer: string }[] | undefined
) {
  const answersMap = new Map(
    screeningAnswers?.map((x) => [x.questionId, x]) ?? []
  );

  if (!screeningQuestions || screeningQuestions.length === 0) {
    return;
  }

  for (const q of screeningQuestions) {
    const trimmed = answersMap.get(q.id)?.answer?.trim();
    if (q.required && (!trimmed || trimmed.length === 0)) {
      throw new Error(`Please answer "${q.prompt}"`);
    }
  }

  const allowedIds = new Set(screeningQuestions.map((q) => q.id));
  for (const a of screeningAnswers ?? []) {
    if (!allowedIds.has(a.questionId)) {
      throw new Error("Invalid screening answers");
    }
  }
}

async function enqueueApplicationWebhook(
  ctx: MutationCtx,
  applicationId: Id<"applications">
) {
  await ctx.scheduler.runAfter(
    0,
    internal.integrations.dispatchApplicationCreated,
    { applicationId }
  );
}

async function notifyApplicationEvent(
  ctx: MutationCtx,
  applicationId: Id<"applications">,
  eventType: ApplicantNotificationEvent,
  options?: {
    extraDedupe?: string;
    scheduledInterviewAt?: number;
  }
) {
  await ctx.scheduler.runAfter(
    0,
    internal.notifications.enqueue.enqueueForApplication,
    {
      applicationId,
      eventType,
      extraDedupe: options?.extraDedupe,
      payloadOverrides:
        options?.scheduledInterviewAt !== undefined
          ? { scheduledInterviewAt: options.scheduledInterviewAt }
          : undefined,
    }
  );
}

export const getUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const apply = mutation({
  args: {
    jobPostingId: v.id("jobPostings"),
    applicantName: v.string(),
    applicantEmail: v.string(),
    phone: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    resumeStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobPostingId);
    if (!job) {
      throw new Error("Job posting not found");
    }
    if (!(await activeJobEligibleForPublicSite(ctx, job))) {
      throw new Error("This posting is no longer accepting applications.");
    }

    if (job.screeningQuestions && job.screeningQuestions.length > 0) {
      throw new Error(
        "This role requires screening questions — sign in to apply with answers."
      );
    }

    const id = await ctx.db.insert("applications", {
      jobPostingId: args.jobPostingId,
      applicantName: args.applicantName,
      applicantEmail: args.applicantEmail,
      phone: args.phone,
      coverLetter: args.coverLetter,
      resumeStorageId: args.resumeStorageId,
      status: "pending",
      withdrawn: false,
    });

    await appendStatusHistory(ctx, id, undefined, "pending");
    await bumpApplicationMetric(ctx, args.jobPostingId);
    await enqueueApplicationWebhook(ctx, id);
    await notifyApplicationEvent(ctx, id, "application_submitted");

    return id;
  },
});

export const applyWithProfile = mutation({
  args: {
    jobPostingId: v.id("jobPostings"),
    coverLetter: v.optional(v.string()),
    callerClerkOrgId: v.optional(v.string()),
    screeningAnswers: v.optional(v.array(screeningAnswerValidator)),
  },
  returns: v.id("applications"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in to apply");

    await throwIfJobSeekerSuspended(ctx, identity.tokenIdentifier);

    const job = await ctx.db.get(args.jobPostingId);
    if (!job) throw new Error("Job posting not found");
    if (job.sourceKind === "aggregated") {
      throw new Error(
        "This listing is hosted on an external job board. Apply on the original site."
      );
    }
    if (!(await activeJobEligibleForPublicSite(ctx, job))) {
      throw new Error("This posting is no longer accepting applications.");
    }

    if (args.callerClerkOrgId && args.callerClerkOrgId === job.clerkOrgId) {
      throw new Error(
        "You cannot apply to your own organization's job posting"
      );
    }

    validateScreeningAnswers(
      job.screeningQuestions ?? [],
      args.screeningAnswers ?? undefined
    );

    const existingRows = await ctx.db
      .query("applications")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .collect();

    const dupe = existingRows.find(
      (row) => row.jobPostingId === args.jobPostingId && row.withdrawn !== true
    );

    if (dupe) throw new Error("You have already applied to this job");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const latestFile = await ctx.db
      .query("profileFiles")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .order("desc")
      .first();

    const id = await ctx.db.insert("applications", {
      jobPostingId: args.jobPostingId,
      applicantName: user?.name ?? identity.name ?? "",
      applicantEmail: user?.email ?? identity.email ?? "",
      phone: profile?.phone,
      coverLetter: args.coverLetter,
      resumeStorageId: latestFile?.storageId,
      tokenIdentifier: identity.tokenIdentifier,
      status: "pending",
      withdrawn: false,
      screeningAnswers: args.screeningAnswers ?? undefined,
    });

    await appendStatusHistory(ctx, id, undefined, "pending");
    await bumpApplicationMetric(ctx, args.jobPostingId);
    await enqueueApplicationWebhook(ctx, id);
    await notifyApplicationEvent(ctx, id, "application_submitted");

    return id;
  },
});

export const withdrawMyApplication = mutation({
  args: { applicationId: v.id("applications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    if (
      !application.tokenIdentifier ||
      application.tokenIdentifier !== identity.tokenIdentifier
    ) {
      throw new Error("Access denied");
    }

    if (application.withdrawn) return null;

    const fromStatus = application.status;

    await ctx.db.patch(application._id, {
      withdrawn: true,
      status: "rejected",
    });

    await appendStatusHistory(ctx, args.applicationId, fromStatus, "rejected");

    const jobMetrics = await ctx.db
      .query("jobMetrics")
      .withIndex("by_job", (q) =>
        q.eq("jobPostingId", application.jobPostingId)
      )
      .unique();

    if (jobMetrics && jobMetrics.applicationCount > 0) {
      await ctx.db.patch(jobMetrics._id, {
        applicationCount: Math.max(jobMetrics.applicationCount - 1, 0),
      });
    }

    return null;
  },
});

export const listNotes = query({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn)
      throw new Error("Application not found");

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);
    if (!canUseEmployerNotes(tier)) {
      throw new Error("Employer notes require Pro");
    }

    const notes = await ctx.db
      .query("applicationNotes")
      .withIndex("by_application", (q) =>
        q.eq("applicationId", args.applicationId)
      )
      .collect();
    return notes.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const addNote = mutation({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
    body: v.string(),
    parentNoteId: v.optional(v.id("applicationNotes")),
  },
  returns: v.id("applicationNotes"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) {
      throw new Error("Application not found");
    }

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseEmployerNotes(tier)) {
      throw new Error("Employer notes require Pro");
    }

    const bodyTrim = args.body.trim();
    if (!bodyTrim) throw new Error("Note cannot be empty");

    if (args.parentNoteId) {
      const parent = await ctx.db.get(args.parentNoteId);
      if (!parent || parent.applicationId !== args.applicationId) {
        throw new Error("Invalid parent note");
      }
    }

    const mentionedEmails = parseMentionedEmails(bodyTrim);

    const noteId = await ctx.db.insert("applicationNotes", {
      applicationId: args.applicationId,
      clerkOrgId: args.clerkOrgId,
      authorTokenIdentifier: identity.tokenIdentifier,
      body: bodyTrim,
      parentNoteId: args.parentNoteId,
      mentionedEmails:
        mentionedEmails.length > 0 ? mentionedEmails : undefined,
    });

    const author = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    const authorName = author?.name ?? identity.name ?? "A teammate";

    for (const email of mentionedEmails) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.enqueue.enqueueNoteMention,
        {
          applicationId: args.applicationId,
          targetEmail: email,
          mentionAuthorName: authorName,
          mentionNoteBody: bodyTrim,
        }
      );
    }

    return noteId;
  },
});

export const listStatusHistory = query({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const rows = await ctx.db
      .query("applicationStatusHistory")
      .withIndex("by_application", (q) =>
        q.eq("applicationId", args.applicationId)
      )
      .collect();

    return rows.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const listByJob = query({
  args: {
    jobPostingId: v.id("jobPostings"),
    clerkOrgId: v.string(),
    status: v.optional(applicationStatusValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const job = await ctx.db.get(args.jobPostingId);
    if (!job) {
      throw new Error("Job posting not found");
    }
    if (job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    let rows =
      args.status !== undefined
        ? await ctx.db
            .query("applications")
            .withIndex("by_job_and_status", (q) =>
              q
                .eq("jobPostingId", args.jobPostingId)
                .eq("status", args.status!)
            )
            .order("desc")
            .take(100)
        : await ctx.db
            .query("applications")
            .withIndex("by_job", (q) =>
              q.eq("jobPostingId", args.jobPostingId)
            )
            .order("desc")
            .take(100);

    rows = rows.filter((a) => a.withdrawn !== true);

    return rows;
  },
});

export const listByOrg = query({
  args: {
    clerkOrgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const jobs = await ctx.db
      .query("jobPostings")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .take(100);

    const jobIds = new Set(jobs.map((j) => j._id));

    const allApplications = await Promise.all(
      jobs.map((job) =>
        ctx.db
          .query("applications")
          .withIndex("by_job", (q) => q.eq("jobPostingId", job._id))
          .take(50)
      )
    );

    const flatRows = allApplications.flat().map((app) => {
      const job = jobs.find((j) => j._id === app.jobPostingId);
      return {
        ...app,
        jobTitle: job?.title ?? "",
        pipelineOrder: job?.pipelineOrder,
      };
    });

    const filteredByWithdrawn = flatRows.filter(
      (a) => jobIds.has(a.jobPostingId) && a.withdrawn !== true
    );

    return filteredByWithdrawn.sort(
      (a, b) => b._creationTime - a._creationTime
    );
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("applications"),
    clerkOrgId: v.string(),
    status: applicationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const application = await ctx.db.get(args.id);
    if (!application) {
      throw new Error("Application not found");
    }
    if (application.withdrawn) {
      throw new Error("This application has been withdrawn");
    }

    const job = await ctx.db.get(application.jobPostingId);
    if (!job) {
      throw new Error("Job posting not found");
    }
    if (job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const tier = await resolveOrgAccessTier(ctx, org);

    if (
      (args.status === "shortlisted" || args.status === "hired") &&
      !canAdvanceToPremiumPipelineStages(tier)
    ) {
      throw new Error(
        "Pro plan required for shortlisted and hired stages (subscription must be active)."
      );
    }

    const fromStatus = application.status;
    await ctx.db.patch(args.id, { status: args.status });

    await appendStatusHistory(
      ctx,
      args.id,
      fromStatus,
      args.status,
      identity.tokenIdentifier
    );

    if (fromStatus !== args.status && args.status !== "pending") {
      await notifyApplicationEvent(
        ctx,
        args.id,
        statusToEventType(args.status)
      );
    }

    return null;
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("applications")),
    clerkOrgId: v.string(),
    status: applicationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", (q) =>
        q.eq("clerkOrgId", args.clerkOrgId)
      )
      .unique();

    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseRecruitingProductivityPack(tier)) {
      throw new Error("Starter or higher is required for bulk actions");
    }

    if (
      (args.status === "shortlisted" || args.status === "hired") &&
      !canAdvanceToPremiumPipelineStages(tier)
    ) {
      throw new Error("Pro required for shortlisted or hired transitions");
    }

    const uniqueIds = [...new Set(args.ids)].slice(0, 50);

    for (const id of uniqueIds) {
      const application = await ctx.db.get(id);
      if (!application || application.withdrawn === true) continue;

      const job = await ctx.db.get(application.jobPostingId);
      if (!job || job.clerkOrgId !== args.clerkOrgId) continue;

      const fromStatus = application.status;
      await ctx.db.patch(id, { status: args.status });

      await appendStatusHistory(
        ctx,
        id,
        fromStatus,
        args.status,
        identity.tokenIdentifier
      );

      if (fromStatus !== args.status && args.status !== "pending") {
        await notifyApplicationEvent(ctx, id, statusToEventType(args.status));
      }
    }

    return null;
  },
});

export const updateApplicationTags = mutation({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
    tags: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const trimmed = [...new Set(args.tags.map((t) => t.trim()).filter(Boolean))]
      .slice(0, 24);

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) {
      throw new Error("Application not found");
    }

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseRecruitingProductivityPack(tier)) {
      throw new Error("Starter or higher required for tagging");
    }

    await ctx.db.patch(args.applicationId, { tags: trimmed });
    return null;
  },
});

export const markEmployerOpened = mutation({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) {
      throw new Error("Application not found");
    }

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canTrackEmployerApplicationViews(tier)) {
      throw new Error("Starter or higher required");
    }

    if (!application.firstOpenedByEmployerAt) {
      await ctx.db.patch(args.applicationId, {
        firstOpenedByEmployerAt: Date.now(),
      });
      await notifyApplicationEvent(
        ctx,
        args.applicationId,
        "employer_viewed"
      );
    }

    return null;
  },
});

export const setInterview = mutation({
  args: {
    applicationId: v.id("applications"),
    clerkOrgId: v.string(),
    scheduledInterviewAt: v.union(v.number(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) {
      throw new Error("Application not found");
    }

    const job = await ctx.db.get(application.jobPostingId);
    if (!job || job.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied");
    }

    const org = await ctx.db.get(job.orgId);
    if (!org) throw new Error("Organization not found");

    const tier = await resolveOrgAccessTier(ctx, org);

    if (!canUseInterviewScheduling(tier)) {
      throw new Error("Starter or higher required");
    }

    const interviewAt =
      args.scheduledInterviewAt === null
        ? undefined
        : args.scheduledInterviewAt;

    await ctx.db.patch(args.applicationId, {
      scheduledInterviewAt: interviewAt,
    });

    if (interviewAt !== undefined) {
      await notifyApplicationEvent(
        ctx,
        args.applicationId,
        "interview_scheduled",
        {
          scheduledInterviewAt: interviewAt,
          extraDedupe: `:${interviewAt}`,
        }
      );
    }

    return null;
  },
});

export const getMyApplication = query({
  args: { jobPostingId: v.id("jobPostings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .collect();

    const match = apps.find(
      (a) => a.jobPostingId === args.jobPostingId && a.withdrawn !== true
    );
    return match ?? null;
  },
});

export const listMyApplications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const applications = await ctx.db
      .query("applications")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .order("desc")
      .take(100);

    const visible = applications.filter((a) => a.withdrawn !== true);

    const enriched = await Promise.all(
      visible.map(async (app) => {
        const job = await ctx.db.get(app.jobPostingId);
        const org = job ? await ctx.db.get(job.orgId) : null;
        const historyRows = await ctx.db
          .query("applicationStatusHistory")
          .withIndex("by_application", (q) =>
            q.eq("applicationId", app._id)
          )
          .collect();

        const historySorted = historyRows.sort(
          (a, b) => a._creationTime - b._creationTime
        );

        return {
          ...app,
          jobTitle: job?.title ?? "Deleted job",
          jobStatus: job?.status ?? "closed",
          companyName: org?.name ?? "",
          companyLogo: org?.logoUrl,
          jobLocation: job?.location,
          jobLocationType: job?.locationType,
          statusTimeline: historySorted.map((row) => ({
            at: row._creationTime,
            from: row.fromStatus ?? null,
            to: row.toStatus,
          })),
          employerSeenAt: app.firstOpenedByEmployerAt,
          scheduledInterviewAt: app.scheduledInterviewAt,
          screeningAnswers: app.screeningAnswers,
        };
      })
    );

    return enriched;
  },
});

export const getResumeUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});
