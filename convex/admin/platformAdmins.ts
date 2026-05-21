import { query } from "../_generated/server";
import { v } from "convex/values";
import { requirePlatformAdmin } from "../lib/platformAdmin";

export const listRecorded = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("platformAdmins"),
      _creationTime: v.number(),
      clerkUserId: v.string(),
      addedAt: v.number(),
      addedByClerkUserId: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);
    return await ctx.db.query("platformAdmins").order("desc").take(200);
  },
});
