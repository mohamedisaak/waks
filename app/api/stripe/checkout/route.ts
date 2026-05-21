import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { api } from "@/convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convexServerClient";
import { isListingProduct } from "@/lib/billingCatalog";
import {
  getStripeSecretKey,
  resolveSiteOrigin,
  stripePriceIdForProduct,
} from "@/lib/stripeBilling";
import type { Id } from "@/convex/_generated/dataModel";

export async function POST(req: Request) {
  try {
    const { userId, orgId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      product?: string;
      clerkOrgId?: string;
      returnPath?: string;
      embedded?: boolean;
    };

    if (!body.product || !isListingProduct(body.product)) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const clerkOrgId = body.clerkOrgId?.trim();
    if (!clerkOrgId) {
      return NextResponse.json(
        { error: "clerkOrgId required" },
        { status: 400 }
      );
    }

    if (orgId && orgId !== clerkOrgId) {
      return NextResponse.json(
        { error: "Organization mismatch" },
        { status: 403 }
      );
    }

    const client = getConvexHttpClient();
    const billingSettings = await client.query(
      api.sitePublic.employerBillingSettings
    );
    if (!billingSettings.employerBillingEnabled) {
      return NextResponse.json(
        { error: "Employer billing is not enabled yet." },
        { status: 403 }
      );
    }

    const convexJwt = await getToken({ template: "convex" }).catch(() => null);
    if (!convexJwt) {
      return NextResponse.json(
        {
          error:
            'Could not mint Convex JWT. Ensure Clerk has a JWT template named "convex".',
        },
        { status: 503 }
      );
    }

    let stripeSecretKey: string;
    let priceId: string;
    try {
      stripeSecretKey = getStripeSecretKey();
      priceId = stripePriceIdForProduct(body.product);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 503 });
    }

    client.setAuth(convexJwt);

    const paymentId = await client.mutation(
      api.stripePayments.createCheckoutRecord,
      {
        clerkOrgId,
        product: body.product,
      }
    );

    const stripe = new Stripe(stripeSecretKey);
    const origin = resolveSiteOrigin();
    const returnPath =
      body.returnPath?.trim() && body.returnPath.startsWith("/")
        ? body.returnPath.trim()
        : "/employers/pricing";

    if (body.embedded) {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        redirect_on_completion: "if_required",
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          clerkOrgId,
          product: body.product,
          convexPaymentId: paymentId,
        },
        return_url: `${origin}${returnPath}?checkout=embedded&session_id={CHECKOUT_SESSION_ID}`,
      });

      if (!session.client_secret || !session.id) {
        return NextResponse.json(
          { error: "Stripe did not return an embedded checkout session" },
          { status: 502 }
        );
      }

      await client.mutation(api.stripePayments.attachStripeSession, {
        paymentId: paymentId as Id<"stripePayments">,
        stripeSessionId: session.id,
      });

      return NextResponse.json({
        clientSecret: session.client_secret,
        sessionId: session.id,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        clerkOrgId,
        product: body.product,
        convexPaymentId: paymentId,
      },
      success_url: `${origin}${returnPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${returnPath}?checkout=cancelled`,
    });

    if (!session.url || !session.id) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 }
      );
    }

    await client.mutation(api.stripePayments.attachStripeSession, {
      paymentId: paymentId as Id<"stripePayments">,
      stripeSessionId: session.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[stripe/checkout]", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
