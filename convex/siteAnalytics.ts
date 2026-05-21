import { mutation } from "./_generated/server";
import { v } from "convex/values";

function utcDayStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function normalizePath(raw: string): string {
  const t = raw.trim().slice(0, 420);
  if (t === "") return "/";
  if (!t.startsWith("/")) return `/${t}`;
  return t;
}

export const recordPageView = mutation({
  args: { path: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const path = normalizePath(args.path);
    const now = Date.now();
    const day = utcDayStartMs(now);

    const existing = await ctx.db
      .query("siteAnalyticsDailyPath")
      .withIndex("by_path_and_day", (q) =>
        q.eq("path", path).eq("dayStartUtcMs", day)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { views: existing.views + 1 });
    } else {
      await ctx.db.insert("siteAnalyticsDailyPath", {
        path,
        dayStartUtcMs: day,
        views: 1,
      });
    }
    return null;
  },
});
