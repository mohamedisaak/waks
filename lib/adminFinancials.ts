import {
  formatKesFromMinorUnits,
  formatUsdFromMinorUnits,
  KES_LISTING_PACK_5_MINOR,
  KES_LISTING_SINGLE_MINOR,
  KES_LEGACY_STARTER_MONTHLY_MINOR,
  KES_PRO_MONTHLY_MINOR,
  mpesaProductAmountKes,
  type MpesaProductSlug,
} from "./billingCatalog";

export type FinancialProductSlug =
  | MpesaProductSlug
  | "listing_single"
  | "listing_pack_5";

export function financialProductLabel(product: string): string {
  switch (product) {
    case "pro_monthly":
      return "Hiring Pro (monthly)";
    case "listing_single":
      return "Listing credit ×1";
    case "listing_pack_5":
      return "Listing credits ×5";
    case "starter":
      return "Legacy Starter (monthly)";
    case "pro":
      return "Legacy Pro (monthly)";
    default:
      return product;
  }
}

/** Expected KES minor units for M-Pesa products (variance checks). */
export function expectedKesMinorForMpesaProduct(product: string): number | null {
  if (
    product === "listing_single" ||
    product === "listing_pack_5" ||
    product === "pro_monthly" ||
    product === "starter" ||
    product === "pro"
  ) {
    return mpesaProductAmountKes(product as MpesaProductSlug) * 100;
  }
  return null;
}

export function expectedKesMinorForCatalogProduct(product: string): number | null {
  switch (product) {
    case "pro_monthly":
    case "pro":
      return KES_PRO_MONTHLY_MINOR;
    case "listing_single":
      return KES_LISTING_SINGLE_MINOR;
    case "listing_pack_5":
      return KES_LISTING_PACK_5_MINOR;
    case "starter":
      return KES_LEGACY_STARTER_MONTHLY_MINOR;
    default:
      return null;
  }
}

export function formatKesMajorUnits(kes: number): string {
  return formatKesFromMinorUnits(kes * 100);
}

export function formatUsdCents(cents: number): string {
  return formatUsdFromMinorUnits(cents);
}

export type FinancialPeriodPreset = "utc_month" | "last_30d";

export function financialRangeForPreset(
  preset: FinancialPeriodPreset,
  viewerClockMs: number
): { rangeStartMs: number; rangeEndMs: number; label: string } {
  if (preset === "last_30d") {
    const rangeEndMs = viewerClockMs;
    const rangeStartMs = viewerClockMs - 30 * 24 * 60 * 60 * 1000;
    return {
      rangeStartMs,
      rangeEndMs,
      label: "Last 30 days",
    };
  }
  const d = new Date(viewerClockMs);
  const rangeStartMs = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const rangeEndMs = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );
  const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")} (UTC)`;
  return { rangeStartMs, rangeEndMs, label };
}
