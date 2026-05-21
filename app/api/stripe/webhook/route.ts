import { NextResponse } from "next/server";
import Stripe from "stripe";
import { api } from "@/convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convexServerClient";
import { isListingProduct } from "@/lib/billingCatalog";
import {
  getStripeFulfillSecret,
  getStripeSecretKey,
  getStripeWebhookSecret,
} from "@/lib/stripeBilling";
import type { Id } from "@/convex/_generated/dataModel";

export async function POST(req: Request) {
  let stripeSecretKey: string;
  let webhookSecret: string;
  try {
    stripeSecretKey = getStripeSecretKey();
    webhookSecret = getStripeWebhookSecret();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe/webhook] signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const clerkOrgId = session.metadata?.clerkOrgId?.trim();
  const product = session.metadata?.product?.trim();
  const convexPaymentIdRaw = session.metadata?.convexPaymentId?.trim();

  if (!clerkOrgId || !product || !isListingProduct(product)) {
    console.error("[stripe/webhook] missing or invalid session metadata", {
      sessionId: session.id,
      clerkOrgId,
      product,
    });
    return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
  }

  let fulfillSecret: string;
  try {
    fulfillSecret = getStripeFulfillSecret();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const client = getConvexHttpClient();

  try {
    await client.mutation(api.stripePayments.fulfillFromStripeWebhook, {
      fulfillSecret,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      clerkOrgId,
      product,
      ...(convexPaymentIdRaw
        ? { convexPaymentId: convexPaymentIdRaw as Id<"stripePayments"> }
        : {}),
    });
  } catch (err: unknown) {
    console.error("[stripe/webhook] fulfillment failed:", err);
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
