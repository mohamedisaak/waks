import type { MutationCtx } from "../_generated/server";

export async function appendAdminAudit(
  ctx: MutationCtx,
  args: {
    actorTokenIdentifier: string | undefined;
    action: string;
    targetTable?: string;
    targetId?: string;
    payload?: unknown;
  }
) {
  await ctx.db.insert("adminAuditLog", {
    actorTokenIdentifier: args.actorTokenIdentifier,
    action: args.action,
    targetTable: args.targetTable,
    targetId: args.targetId,
    payload:
      args.payload !== undefined ? JSON.stringify(args.payload) : undefined,
    createdAt: Date.now(),
  });
}
