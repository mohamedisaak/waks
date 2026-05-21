import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { filterJobsForPublicJobBoard } from "./lib/jobPublicVisibility";

const workplaceValidator = v.union(
  v.literal("remote"),
  v.literal("onsite"),
  v.literal("hybrid")
);

const employmentValidator = v.union(
  v.literal("full-time"),
  v.literal("part-time"),
  v.literal("contract"),
  v.literal("internship")
);

function jobMatchesSavedAlert(job: {
  status: string;
  title: string;
  description: string;
  requirements: string;
  searchBlob?: string;
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  employmentType:
    | "full-time"
    | "part-time"
    | "contract"
    | "internship";
  _creationTime: number;
}, alert: {
  search?: string | undefined;
  locationSubstring?: string | undefined;
  locationType?: "remote" | "onsite" | "hybrid" | undefined;
  employmentType?:
    | "full-time"
    | "part-time"
    | "contract"
    | "internship"
    | undefined;
}, sinceWatermark: number) {
  if (job.status !== "active") return false;
  if (job._creationTime <= sinceWatermark) return false;

  if (
    alert.locationType !== undefined &&
    job.locationType !== alert.locationType
  ) {
    return false;
  }

  if (
    alert.employmentType !== undefined &&
    job.employmentType !== alert.employmentType
  ) {
    return false;
  }

  if (alert.locationSubstring?.trim()?.length) {
    const needle = alert.locationSubstring.trim().toLowerCase();
    if (!job.location.toLowerCase().includes(needle)) {
      return false;
    }
  }

  const blob = `${job.searchBlob ?? ""}`.toLowerCase();
  const haystack =
    blob.length > 0
      ? blob
      : `${job.title} ${job.description} ${job.requirements}`.toLowerCase();

  if (alert.search?.trim()?.length) {
    const terms = alert.search
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    for (const t of terms) {
      if (!haystack.includes(t)) return false;
    }
  }

  return true;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("savedJobAlerts")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    search: v.optional(v.string()),
    locationSubstring: v.optional(v.string()),
    locationType: v.optional(workplaceValidator),
    employmentType: v.optional(employmentValidator),
    notifyDaily: v.boolean(),
    notifyWeekly: v.boolean(),
  },
  returns: v.id("savedJobAlerts"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    if (!args.notifyDaily && !args.notifyWeekly) {
      throw new Error("Enable at least one notification cadence");
    }

    return await ctx.db.insert("savedJobAlerts", {
      tokenIdentifier: identity.tokenIdentifier,
      name: args.name.trim() || "Saved search",
      search: args.search?.trim(),
      locationSubstring: args.locationSubstring?.trim(),
      locationType: args.locationType,
      employmentType: args.employmentType,
      notifyDaily: args.notifyDaily,
      notifyWeekly: args.notifyWeekly,
      updatedAt: Date.now(),
    });
  },
});

export const updateAlert = mutation({
  args: {
    id: v.id("savedJobAlerts"),
    name: v.optional(v.string()),
    search: v.optional(v.string()),
    locationSubstring: v.optional(v.string()),
    locationType: v.optional(workplaceValidator),
    employmentType: v.optional(employmentValidator),
    notifyDaily: v.optional(v.boolean()),
    notifyWeekly: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Alert not found");
    }

    const notifyDaily =
      args.notifyDaily !== undefined ? args.notifyDaily : existing.notifyDaily;
    const notifyWeekly =
      args.notifyWeekly !== undefined
        ? args.notifyWeekly
        : existing.notifyWeekly;

    if (!notifyDaily && !notifyWeekly) {
      throw new Error("Enable at least one notification cadence");
    }

    await ctx.db.patch(existing._id, {
      ...(args.name !== undefined && { name: args.name.trim() }),
      ...(args.search !== undefined && { search: args.search.trim() }),
      ...(args.locationSubstring !== undefined && {
        locationSubstring: args.locationSubstring.trim(),
      }),
      ...(args.locationType !== undefined && {
        locationType: args.locationType,
      }),
      ...(args.employmentType !== undefined && {
        employmentType: args.employmentType,
      }),
      notifyDaily,
      notifyWeekly,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const deleteAlert = mutation({
  args: { id: v.id("savedJobAlerts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error("Alert not found");
    }

    await ctx.db.delete(existing._id);
    return null;
  },
});

const notificationKindValidator = v.union(
  v.literal("job_alert"),
  v.literal("application")
);

export const listUnreadNotifications = query({
  args: {
    limit: v.optional(v.number()),
    kind: v.optional(notificationKindValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const cap = Math.min(Math.max(args.limit ?? 40, 1), 200);

    const rows = await ctx.db
      .query("jobSeekerNotifications")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .filter((q) => q.eq(q.field("read"), false))
      .order("desc")
      .take(cap);

    if (args.kind === undefined) {
      return rows;
    }

    return rows.filter((row) => row.kind === args.kind);
  },
});

export const markNotificationsRead = mutation({
  args: {
    ids: v.array(v.id("jobSeekerNotifications")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const uniqueIds = [...new Set(args.ids)].slice(0, 100);

    for (const id of uniqueIds) {
      const row = await ctx.db.get(id);
      if (!row || row.tokenIdentifier !== identity.tokenIdentifier) continue;
      await ctx.db.patch(id, { read: true });
    }

    return null;
  },
});

export const sweepSavedSearchAlerts = internalMutation({
  args: {
    mode: v.union(v.literal("daily"), v.literal("weekly")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("savedJobAlerts").take(750);

    const jobsRaw = await ctx.db
      .query("jobPostings")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(250);

    const jobsDesc = await filterJobsForPublicJobBoard(ctx, jobsRaw);

    for (const alert of rows) {
      const runsDaily = alert.notifyDaily && args.mode === "daily";
      const runsWeekly = alert.notifyWeekly && args.mode === "weekly";

      if (!runsDaily && !runsWeekly) {
        continue;
      }

      const since = alert.lastWatermark ?? 0;
      let matchesNew = false;

      const matchedTitles: string[] = [];
      let newestSeen = since;

      for (const job of jobsDesc) {
        if (job._creationTime <= since) break;

        if (!jobMatchesSavedAlert(job, alert, since)) {
          newestSeen = Math.max(newestSeen, job._creationTime);
          continue;
        }

        matchesNew = true;
        newestSeen = Math.max(newestSeen, job._creationTime);
        matchedTitles.push(job.title);

        if (matchedTitles.length >= 8) {
          break;
        }
      }

      if (matchesNew) {
        await ctx.db.insert("jobSeekerNotifications", {
          tokenIdentifier: alert.tokenIdentifier,
          title: `New openings for "${alert.name}"`,
          body: `${matchedTitles.length} new posting${
            matchedTitles.length !== 1 ? "s" : ""
          }: ${matchedTitles.join(", ")}`,
          kind: "job_alert",
          savedJobAlertId: alert._id,
          linkPath: "/jobs",
          read: false,
        });
      }

      await ctx.db.patch(alert._id, {
        lastWatermark: newestSeen > since ? newestSeen : since,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
