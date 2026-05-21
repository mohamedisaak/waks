/** KES amounts in minor units (cent-equivalents: KES × 100). */

export const FREE_ACTIVE_JOB_SLOTS = 1;

/** Extra concurrent active job slot — one-off M-Pesa / card. */
export const KES_LISTING_SINGLE_MINOR = 100_000; // KES 1,000

/** Five listing credits (20% pack discount vs singles). */
export const KES_LISTING_PACK_5_MINOR = 400_000; // KES 4,000

/** Hiring Pro — ATS, analytics, team workflow (monthly). */
export const KES_PRO_MONTHLY_MINOR = 350_000; // KES 3,500

/** Optional featured boost per job (future checkout). */
export const KES_FEATURED_JOB_MINOR = 50_000; // KES 500

export const LISTING_PACK_CREDITS = 5;

/** USD card checkout — approximate FX equivalents (cents). */
export const USD_LISTING_SINGLE_MINOR = 800; // $8.00

export const USD_LISTING_PACK_5_MINOR = 3200; // $32.00

/** Hiring Pro — monthly card checkout (approximate FX vs KES 3,500). */
export const USD_PRO_MONTHLY_MINOR = 2800; // $28.00

/** @deprecated Legacy Clerk plan slug — grandfathered unlimited listings only. */
export const KES_LEGACY_STARTER_MONTHLY_MINOR = 200;

export const KES_MONTHLY_MINOR_UNITS = {
  pro: KES_PRO_MONTHLY_MINOR,
} as const;

export type ListingProductSlug = "listing_single" | "listing_pack_5";

export type MpesaProductSlug =
  | "pro_monthly"
  | ListingProductSlug
  /** @deprecated Legacy subscription SKU */
  | "starter"
  /** @deprecated Legacy subscription SKU */
  | "pro";

export function isListingProduct(
  product: string
): product is ListingProductSlug {
  return product === "listing_single" || product === "listing_pack_5";
}

export function mpesaProductAmountKes(product: MpesaProductSlug): number {
  switch (product) {
    case "pro_monthly":
    case "pro":
      return KES_PRO_MONTHLY_MINOR / 100;
    case "listing_single":
      return KES_LISTING_SINGLE_MINOR / 100;
    case "listing_pack_5":
      return KES_LISTING_PACK_5_MINOR / 100;
    case "starter":
      return KES_LEGACY_STARTER_MONTHLY_MINOR / 100;
    default: {
      const _exhaustive: never = product;
      return _exhaustive;
    }
  }
}

export function listingCreditsForProduct(
  product: ListingProductSlug | MpesaProductSlug
): number {
  switch (product) {
    case "listing_single":
      return 1;
    case "listing_pack_5":
      return LISTING_PACK_CREDITS;
    default:
      return 0;
  }
}

export function usdMinorUnitsForListingProduct(
  product: ListingProductSlug
): number {
  switch (product) {
    case "listing_single":
      return USD_LISTING_SINGLE_MINOR;
    case "listing_pack_5":
      return USD_LISTING_PACK_5_MINOR;
    default: {
      const _exhaustive: never = product;
      return _exhaustive;
    }
  }
}

const kesMinorFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const usdMinorFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatKesFromMinorUnits(minorUnits: number): string {
  return kesMinorFormatter.format(minorUnits / 100);
}

export function formatUsdFromMinorUnits(minorUnits: number): string {
  return usdMinorFormatter.format(minorUnits / 100);
}
