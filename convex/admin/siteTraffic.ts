import { query } from "../_generated/server";
import { v } from "convex/values";
import { requirePlatformAdmin } from "../lib/platformAdmin";

function utcDayStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Rolls up `{ path, views }` for rows whose UTC day equals that of `dayUtcMs`,
 * ordered by descending views using index `by_day_and_path`.
 */
export const pathsForUtcDay = query({
  args: { dayUtcMs: v.number() },
  returns: v.array(
    v.object({
      path: v.string(),
      views: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requirePlatformAdmin(ctx);
    const day = utcDayStartMs(args.dayUtcMs);

    const merged = new Map<string, number>();
    let cursor: string | null = null;

    for (let i = 0; i < 240; i++) {
      const page = await ctx.db
        .query("siteAnalyticsDailyPath")
        .withIndex("by_day_and_path", (q) => q.eq("dayStartUtcMs", day))
        .order("asc")
        .paginate({ numItems: 120, cursor });

      for (const doc of page.page) {
        const normalized = doc.path.trim() !== "" ? doc.path : "/";
        merged.set(normalized, (merged.get(normalized) ?? 0) + doc.views);
      }

      if (page.isDone) break;
      cursor = page.continueCursor;
      if (!page.page.length) break;
    }

    return [...merged.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views);
  },
});
