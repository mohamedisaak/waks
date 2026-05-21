import { query } from "../_generated/server";
import { v } from "convex/values";
import { requirePlatformAdmin } from "../lib/platformAdmin";

/** Client gate for admin UI — does not throw. Avoids Date/time side effects in auth path. */
export const isViewerPlatformAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    try {
      await requirePlatformAdmin(ctx);
      return true;
    } catch {
      return false;
    }
  },
});
