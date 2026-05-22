import type { ListingProductSlug } from "@/lib/billingCatalog";

export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return key;
}

export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

export function stripePriceIdForProduct(product: ListingProductSlug): string {
  const priceId =
    product === "listing_single"
      ? process.env.STRIPE_PRICE_LISTING_SINGLE?.trim()
      : process.env.STRIPE_PRICE_LISTING_PACK_5?.trim();

  if (!priceId) {
    throw new Error(
      product === "listing_single"
        ? "Missing STRIPE_PRICE_LISTING_SINGLE"
        : "Missing STRIPE_PRICE_LISTING_PACK_5"
    );
  }

  return priceId;
}

export function getStripeFulfillSecret(): string {
  const secret =
    process.env.STRIPE_FULFILL_SECRET?.trim() ??
    process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing STRIPE_FULFILL_SECRET or STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

import { getSiteOrigin } from "@/lib/siteUrl";

export function resolveSiteOrigin(): string {
  return getSiteOrigin();
}
