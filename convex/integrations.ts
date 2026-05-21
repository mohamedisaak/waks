import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const webhookApplicationPayload = internalQuery({
  args: { applicationId: v.id("applications") },
  returns: v.union(
    v.object({
      webhookEvent: v.literal("application.created"),
      payload: v.object({
        applicationId: v.id("applications"),
        jobPostingId: v.id("jobPostings"),
        applicantName: v.string(),
        applicantEmail: v.string(),
        jobTitle: v.string(),
        status: v.string(),
        resumeStorageIdPresent: v.boolean(),
      }),
      targets: v.array(
        v.object({
          webhookId: v.id("organizationWebhooks"),
          url: v.string(),
          signingSecret: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);
    if (!application || application.withdrawn) return null;

    const job = await ctx.db.get(application.jobPostingId);
    if (!job) return null;

    const hooks = await ctx.db
      .query("organizationWebhooks")
      .withIndex("by_org", (q) => q.eq("clerkOrgId", job.clerkOrgId))
      .collect();

    const targets = hooks
      .filter(
        (h) => h.enabled && h.eventTypes.includes("application.created")
      )
      .map((h) => ({
        webhookId: h._id,
        url: h.url,
        signingSecret: h.signingSecret,
      }));

    if (targets.length === 0) return null;

    const payloadBody = {
      applicationId: application._id,
      jobPostingId: job._id,
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      jobTitle: job.title,
      status: application.status,
      resumeStorageIdPresent: !!application.resumeStorageId,
    };

    return {
      webhookEvent: "application.created" as const,
      payload: payloadBody,
      targets,
    };
  },
});

async function hexHmac(secret: string, body: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const dispatchApplicationCreated = internalAction({
  args: { applicationId: v.id("applications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const envelope: {
      webhookEvent: "application.created";
      payload: Record<string, unknown>;
      targets: { webhookId: string; url: string; signingSecret?: string }[];
    } | null = await ctx.runQuery(
      internal.integrations.webhookApplicationPayload,
      { applicationId: args.applicationId }
    );
    if (!envelope) return null;

    const body = JSON.stringify({
      event: envelope.webhookEvent,
      occurredAt: Date.now(),
      ...envelope.payload,
    });

    for (const target of envelope.targets) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Waks-Event": envelope.webhookEvent,
      };

      if (target.signingSecret) {
        headers["X-Waks-Signature-SHA256"] = await hexHmac(
          target.signingSecret,
          body
        );
      }

      try {
        await fetch(target.url, { method: "POST", headers, body });
      } catch {
        // outbound webhooks are best-effort; failures should not rollback applications
      }
    }

    return null;
  },
});
