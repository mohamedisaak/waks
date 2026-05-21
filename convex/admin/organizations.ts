import { query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel";
import { requirePlatformAdmin } from "../lib/platformAdmin";
import { adminSortDirectionValidator } from "./sharedValidators";
import {
  ADMIN_LIST_SORT_CAP,
  compareStrings,
  paginateSortedArray,
  type AdminSortDirection,
} from "../lib/adminListPagination";

const orgAdminSortByValidator = v.union(
  v.literal("created"),
  v.literal("name"),
  v.literal("plan")
);

const planValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("pro")
);

const billingValidator = v.union(
  v.literal("clerk_stripe"),
  v.literal("mpesa")
);

const orgSummary = v.object({
  _id: v.id("organizations"),
  _creationTime: v.number(),
  clerkOrgId: v.string(),
  name: v.string(),
  slug: v.string(),
  logoUrl: v.optional(v.string()),
  plan: planValidator,
  subscriptionExpiresAt: v.optional(v.number()),
  billingProvider: v.optional(billingValidator),
  memberCount: v.number(),
  createdAt: v.number(),
  website: v.optional(v.string()),
  industry: v.optional(v.string()),
  companySize: v.optional(v.string()),
  description: v.optional(v.string()),
  location: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  twitter: v.optional(v.string()),
  phone: v.optional(v.string()),
  platformSuspendedAt: v.optional(v.number()),
  platformSuspendedReason: v.optional(v.string()),
  listingCredits: v.optional(v.number()),
  legacyUnlimitedListings: v.optional(v.boolean()),
});

function sortOrgSummaries(
  rows: Doc<"organizations">[],
  sortBy: "created" | "name" | "plan",
  sortOrder: AdminSortDirection
): Doc<"organizations">[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return compareStrings(a.name, b.name, sortOrder);
      case "plan":
        return compareStrings(a.plan, b.plan, sortOrder);
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
    sortBy: v.optional(orgAdminSortByValidator),
    sortOrder: v.optional(adminSortDirectionValidator),
  },
  returns: paginationResultValidator(orgSummary),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);

    const sortBy = args.sortBy ?? "created";
    const sortOrder = args.sortOrder ?? "desc";

    if (sortBy === "name") {
      return await ctx.db
        .query("organizations")
        .withIndex("by_name")
        .order(sortOrder)
        .paginate(args.paginationOpts);
    }

    if (sortBy === "created") {
      return await ctx.db
        .query("organizations")
        .order(sortOrder)
        .paginate(args.paginationOpts);
    }

    const rows = await ctx.db
      .query("organizations")
      .order("desc")
      .take(ADMIN_LIST_SORT_CAP);
    const sorted = sortOrgSummaries(rows, sortBy, sortOrder);
    return paginateSortedArray(sorted, args.paginationOpts);
  },
});

export const get = query({
  args: { orgId: v.id("organizations") },
  returns: v.union(orgSummary, v.null()),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const row = await ctx.db.get(args.orgId);
    return row ?? null;
  },
});
