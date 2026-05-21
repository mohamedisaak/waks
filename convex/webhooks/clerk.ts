import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Webhook } from "svix";

type PlanSlug = "free" | "starter" | "pro";

function normalizePlan(slug: string): PlanSlug {
  const lower = slug.toLowerCase();
  if (lower === "starter" || lower === "pro") return lower;
  return "free";
}

function maxPeriodEndFromItems(items: unknown): number | undefined {
  if (!Array.isArray(items)) return undefined;
  let max = 0;
  for (const raw of items) {
    const end = (raw as { period_end?: number }).period_end;
    if (typeof end === "number" && end > max) max = end;
  }
  return max > 0 ? max : undefined;
}

function dominantPlanFromItems(items: unknown): PlanSlug {
  if (!Array.isArray(items)) return "free";
  let best: PlanSlug = "free";
  for (const raw of items) {
    const item = raw as {
      plan?: { slug?: string };
      status?: string;
    };
    if (
      item.status === "ended" ||
      item.status === "abandoned" ||
      item.status === "expired"
    ) {
      continue;
    }
    const slug = normalizePlan(item.plan?.slug ?? "");
    if (slug === "pro") return "pro";
    if (slug === "starter") best = "starter";
  }
  return best;
}

export const clerkWebhookHandler = httpAction(async (ctx, req) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const { type, data } = event;

  async function syncFromClerkSubscriptionPayload(
    orgId: string,
    payload: Record<string, unknown>
  ) {
    const status = payload.status as string | undefined;
    const items = payload.items ?? payload.subscription_items;
    const periodEnd = maxPeriodEndFromItems(items);
    let planSlug = dominantPlanFromItems(items);

    const topPlanSlug = normalizePlan(
      ((payload.plan as { slug?: string } | undefined)?.slug ?? "") || ""
    );
    if (planSlug === "free" && topPlanSlug !== "free") {
      planSlug = topPlanSlug;
    }

    if (
      status === "ended" ||
      status === "expired" ||
      status === "abandoned"
    ) {
      planSlug = "free";
    }

    await ctx.runMutation(internal.organizations.syncPlan, {
      clerkOrgId: orgId,
      plan: planSlug,
      ...(planSlug !== "free" && periodEnd !== undefined
        ? { subscriptionExpiresAt: periodEnd }
        : {}),
      billingProvider: planSlug === "free" ? null : "clerk_stripe",
    });
  }

  async function syncFromSubscriptionItemPayload(
    orgId: string,
    payload: Record<string, unknown>
  ) {
    const planSlug = normalizePlan(
      ((payload.plan as { slug?: string } | undefined)?.slug ?? "") || ""
    );
    const periodEnd =
      typeof payload.period_end === "number"
        ? payload.period_end
        : undefined;
    const status = payload.status as string | undefined;

    if (
      status === "ended" ||
      status === "abandoned" ||
      status === "expired"
    ) {
      await ctx.runMutation(internal.organizations.syncPlan, {
        clerkOrgId: orgId,
        plan: "free",
        billingProvider: null,
      });
      return;
    }

    if (planSlug === "free") return;

    await ctx.runMutation(internal.organizations.syncPlan, {
      clerkOrgId: orgId,
      plan: planSlug,
      ...(periodEnd !== undefined ? { subscriptionExpiresAt: periodEnd } : {}),
      billingProvider: "clerk_stripe",
    });
  }

  try {
    if (type === "user.created" || type === "user.updated") {
      const emailAddresses = data.email_addresses as Array<{
        email_address: string;
        id: string;
      }>;
      const primaryEmailId = data.primary_email_address_id as string;
      const primaryEmail =
        emailAddresses.find((e) => e.id === primaryEmailId)
          ?.email_address ?? "";

      await ctx.runMutation(internal.users.upsertFromWebhook, {
        clerkUserId: data.id as string,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        email: primaryEmail,
      });
    }

    if (type === "organization.created" || type === "organization.updated") {
      await ctx.runMutation(internal.organizations.upsertFromWebhook, {
        clerkOrgId: data.id as string,
        name: data.name as string,
        slug: data.slug as string,
        logoUrl: (data.image_url as string | null) ?? undefined,
        createdAt: data.created_at as number,
      });
    }

    if (type === "organizationMembership.created") {
      const orgData = data.organization as { id: string };
      await ctx.runMutation(internal.organizations.syncMemberCount, {
        clerkOrgId: orgData.id,
        delta: 1,
      });
    }

    if (type === "organizationMembership.deleted") {
      const orgData = data.organization as { id: string };
      await ctx.runMutation(internal.organizations.syncMemberCount, {
        clerkOrgId: orgData.id,
        delta: -1,
      });
    }

    if (
      type === "organization.subscription.created" ||
      type === "organization.subscription.updated"
    ) {
      const orgId = data.organization_id as string;
      const items =
        (data as { subscription_items?: unknown }).subscription_items ??
        (data as { items?: unknown }).items;
      const periodEnd = maxPeriodEndFromItems(items);
      const planSlug = normalizePlan(
        ((data.plan as { slug?: string })?.slug ?? "free")
      );

      await ctx.runMutation(internal.organizations.syncPlan, {
        clerkOrgId: orgId,
        plan: planSlug,
        ...(planSlug !== "free" && periodEnd !== undefined
          ? { subscriptionExpiresAt: periodEnd }
          : {}),
        billingProvider: planSlug === "free" ? null : "clerk_stripe",
      });
    }

    if (type === "organization.subscription.deleted") {
      const orgId = data.organization_id as string;
      await ctx.runMutation(internal.organizations.syncPlan, {
        clerkOrgId: orgId,
        plan: "free",
        billingProvider: null,
      });
    }

    if (
      type === "subscription.created" ||
      type === "subscription.updated" ||
      type === "subscription.active" ||
      type === "subscription.pastDue"
    ) {
      const payer = data.payer as { organization_id?: string } | undefined;
      const orgId = payer?.organization_id;
      if (orgId) {
        await syncFromClerkSubscriptionPayload(orgId, data);
      }
    }

    if (
      type === "subscriptionItem.created" ||
      type === "subscriptionItem.updated" ||
      type === "subscriptionItem.active" ||
      type === "subscriptionItem.upcoming" ||
      type === "subscriptionItem.pastDue" ||
      type === "subscriptionItem.freeTrialEnding"
    ) {
      const payer = data.payer as { organization_id?: string } | undefined;
      const orgId = payer?.organization_id;
      if (orgId) {
        await syncFromSubscriptionItemPayload(orgId, data);
      }
    }
  } catch (err) {
    console.error(`Failed to process webhook event ${type}:`, err);
    return new Response("Internal error processing webhook", { status: 500 });
  }

  return new Response(null, { status: 200 });
});
