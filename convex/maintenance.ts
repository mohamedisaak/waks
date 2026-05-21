import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { buildJobSearchBlob } from "./lib/jobUtils";

/**
 * Repairs search indexes for legacy postings missing `searchBlob`.
 * Safe to call multiple times (`npx convex run maintenance:fillJobSearchBlob`).
 */
export const fillJobSearchBlob = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const jobs = await ctx.db.query("jobPostings").take(512);
    for (const job of jobs) {
      const blob = buildJobSearchBlob({
        title: job.title,
        description: job.description,
        requirements: job.requirements,
      });
      if (job.searchBlob !== blob) {
        await ctx.db.patch(job._id, { searchBlob: blob });
      }
    }
    return null;
  },
});
