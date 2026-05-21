import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Verified server-to-server hook for your Kenyan PSP (Flutterwave, Pesapal,
 * Daraja aggregator, etc.). Idempotent grants live in Convex via internal mutation.
 *
 * Authorization: Bearer token matching deployment env MPESA_WEBHOOK_SECRET.
 *
 * Body JSON:
 * { clerkOrgId: string, plan: "starter"|"pro", monthsPaid?: number, subscriptionExpiresAt?: number }
 */
export const mpesaPaymentWebhook = httpAction(async (ctx, req) => {
  const secret = process.env.MPESA_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("MPESA_WEBHOOK_SECRET not configured", {
      status: 503,
    });
  }

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!bearer || bearer !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    clerkOrgId?: string;
    plan?: string;
    monthsPaid?: number;
    subscriptionExpiresAt?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.clerkOrgId || !body.plan) {
    return new Response("Missing clerkOrgId or plan", { status: 400 });
  }

  const plan = body.plan.toLowerCase();
  if (plan !== "starter" && plan !== "pro") {
    return new Response("Invalid plan", { status: 400 });
  }

  const monthsPaid =
    typeof body.monthsPaid === "number" && body.monthsPaid > 0
      ? body.monthsPaid
      : 1;

  try {
    await ctx.runMutation(
      internal.organizations.applyMpesaSubscriptionFromWebhook,
      {
        clerkOrgId: body.clerkOrgId,
        plan,
        monthsPaid,
        ...(body.subscriptionExpiresAt !== undefined
          ? { subscriptionExpiresAt: body.subscriptionExpiresAt }
          : {}),
      }
    );
  } catch (err) {
    console.error("mpesa webhook:", err);
    return new Response("Processing failed", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
