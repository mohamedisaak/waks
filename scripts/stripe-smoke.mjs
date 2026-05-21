#!/usr/bin/env node

/**
 * Verifies Stripe env + API connectivity (no browser checkout).
 * Run after: npm run stripe:setup
 */
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import Stripe from "stripe";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!/^sk_(test|live)_/.test(secretKey ?? "")) {
    fail("STRIPE_SECRET_KEY missing — add sk_test_... to .env.local");
  }

  const priceSingle = process.env.STRIPE_PRICE_LISTING_SINGLE?.trim();
  const pricePack = process.env.STRIPE_PRICE_LISTING_PACK_5?.trim();
  if (!/^price_/.test(priceSingle ?? "")) {
    fail("STRIPE_PRICE_LISTING_SINGLE missing — run npm run stripe:setup");
  }
  if (!/^price_/.test(pricePack ?? "")) {
    fail("STRIPE_PRICE_LISTING_PACK_5 missing — run npm run stripe:setup");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!/^whsec_/.test(webhookSecret ?? "")) {
    fail("STRIPE_WEBHOOK_SECRET missing — run npm run stripe:setup");
  }

  const fulfillSecret = process.env.STRIPE_FULFILL_SECRET?.trim();
  if (!fulfillSecret) {
    fail("STRIPE_FULFILL_SECRET missing");
  }

  const stripe = new Stripe(secretKey);

  const account = await stripe.accounts.retrieve();
  console.log(`✓ Stripe API OK (${account.id})`);

  for (const [label, priceId, expectedCents] of [
    ["listing_single", priceSingle, 800],
    ["listing_pack_5", pricePack, 3200],
  ]) {
    const price = await stripe.prices.retrieve(priceId);
    if (price.currency !== "usd" || price.unit_amount !== expectedCents) {
      fail(
        `${label}: price ${priceId} is ${price.currency} ${price.unit_amount}, expected usd ${expectedCents}`
      );
    }
    console.log(`✓ ${label} price ${priceId} ($${expectedCents / 100})`);
  }

  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const hasCheckout = endpoints.data.some((e) =>
    e.enabled_events.includes("checkout.session.completed")
  );
  if (!hasCheckout) {
    console.warn(
      "⚠ No webhook endpoint with checkout.session.completed — run stripe:setup with ngrok"
    );
  } else {
    console.log("✓ Webhook endpoint registered for checkout.session.completed");
  }

  console.log("\nManual step: pay on /employers/pricing with card 4242 4242 4242 4242");
  console.log("Then confirm credits in the app and webhook success in Stripe Dashboard.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
