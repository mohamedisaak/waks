import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import { adminSortDirectionValidator } from "./sharedValidators";
import {
  ADMIN_LIST_SORT_CAP,
  compareStrings,
  paginateSortedArray,
  type AdminSortDirection,
} from "../lib/adminListPagination";

const jobseekerAdminSortByValidator = v.union(
  v.literal("created"),
  v.literal("name"),
  v.literal("email")
);

const userRow = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  clerkUserId: v.string(),
  name: v.string(),
  email: v.string(),
  platformSuspendedAt: v.optional(v.number()),
  platformSuspendedReason: v.optional(v.string()),
  profileSummary: v.optional(
    v.object({
      headline: v.optional(v.string()),
      location: v.optional(v.string()),
    })
  ),
});

async function hydrateUserRows(ctx: QueryCtx, rows: Doc<"users">[]) {
  const out: Array<{
    _id: Doc<"users">["_id"];
    _creationTime: number;
    tokenIdentifier: string;
    clerkUserId: string;
    name: string;
    email: string;
    platformSuspendedAt?: number;
    platformSuspendedReason?: string;
    profileSummary?: { headline?: string; location?: string };
  }> = [];
  for (const u of rows) {
    const prof = await ctx.db
      .query("profiles")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", u.tokenIdentifier))
      .unique();
    out.push({
      _id: u._id,
      _creationTime: u._creationTime,
      tokenIdentifier: u.tokenIdentifier,
      clerkUserId: u.clerkUserId,
      name: u.name,
      email: u.email,
      platformSuspendedAt: u.platformSuspendedAt,
      platformSuspendedReason: u.platformSuspendedReason,
      profileSummary:
        prof ?
          {
            headline: prof.headline,
            location: prof.location,
          }
        : undefined,
    });
  }
  return out;
}

type JobseekerAdminRow = Awaited<ReturnType<typeof hydrateUserRows>>[number];

function sortJobseekerAdminRows(
  rows: JobseekerAdminRow[],
  sortBy: "created" | "name" | "email",
  sortOrder: AdminSortDirection
): JobseekerAdminRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return compareStrings(a.name, b.name, sortOrder);
      case "email":
        return compareStrings(a.email, b.email, sortOrder);
      case "created":
      default:
        return sortOrder === "asc"
          ? a._creationTime - b._creationTime
          : b._creationTime - a._creationTime;
    }
  });
  return sorted;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(jobseekerAdminSortByValidator),
    sortOrder: v.optional(adminSortDirectionValidator),
  },
  returns: paginationResultValidator(userRow),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const sortBy = args.sortBy ?? "created";
    const sortOrder = args.sortOrder ?? "desc";

    if (sortBy === "created") {
      const page = await ctx.db
        .query("users")
        .order(sortOrder)
        .paginate(args.paginationOpts);
      const hydrated = await hydrateUserRows(ctx, page.page);
      return { ...page, page: hydrated };
    }

    const rows = await ctx.db
      .query("users")
      .order("desc")
      .take(ADMIN_LIST_SORT_CAP);
    const hydrated = sortJobseekerAdminRows(
      await hydrateUserRows(ctx, rows),
      sortBy,
      sortOrder
    );
    return paginateSortedArray(hydrated, args.paginationOpts);
  },
});

export const get = query({
  args: { userId: v.id("users") },
  returns: v.union(userRow, v.null()),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const u = await ctx.db.get(args.userId);
    if (!u) return null;
    const [hydrated] = await hydrateUserRows(ctx, [u]);
    return hydrated;
  },
});

export const dossierByUserId = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      user: userRow,
      applicationsCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const u = await ctx.db.get(args.userId);
    if (!u) return null;
    const [hydrated] = await hydrateUserRows(ctx, [u]);
    let applicationsCount = 0;
    if (u.tokenIdentifier) {
    const apps = await ctx.db
      .query("applications")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", u.tokenIdentifier))
      .take(502);
      applicationsCount = apps.length;
    }
    return { user: hydrated, applicationsCount };
  },
});
