"use client";

import Link from "next/link";
import {
  formatKesFromMinorUnits,
  KES_LISTING_SINGLE_MINOR,
} from "@/lib/billingCatalog";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";

export type ListingEntitlementsSummary = {
  activeJobCount: number;
  maxActiveJobSlots: number;
  listingCredits: number;
  legacyUnlimitedListings: boolean;
  slotsRemaining: number;
  canActivateMoreJobs: boolean;
};

type Props = {
  entitlements: ListingEntitlementsSummary;
  variant?: "default" | "compact";
};

export default function ListingCreditsBanner({
  entitlements,
  variant = "default",
}: Props) {
  const employerBillingEnabled = useEmployerBillingEnabled();
  if (employerBillingEnabled === false) {
    return null;
  }

  if (entitlements.legacyUnlimitedListings) {
    return (
      <p className="rounded-lg border border-border-strong bg-canvas px-4 py-3 text-sm text-muted">
        Legacy plan: unlimited concurrent active job postings.
      </p>
    );
  }

  const atLimit = !entitlements.canActivateMoreJobs;
  const creditPrice = formatKesFromMinorUnits(KES_LISTING_SINGLE_MINOR);

  if (variant === "compact") {
    return (
      <p
        className={`text-sm ${atLimit ? "text-warning-text" : "text-muted"}`}
      >
        {entitlements.activeJobCount} active · {entitlements.listingCredits}{" "}
        unused credit{entitlements.listingCredits === 1 ? "" : "s"} ·{" "}
        {entitlements.slotsRemaining} slot
        {entitlements.slotsRemaining === 1 ? "" : "s"} left (max{" "}
        {entitlements.maxActiveJobSlots})
        {atLimit && (
          <>
            {" "}
            ·{" "}
            <Link
              href="/employers/pricing"
              className="font-medium text-warning-text underline hover:no-underline"
            >
              Buy credits
            </Link>
          </>
        )}
      </p>
    );
  }

  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        atLimit
          ? "border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100"
          : "border-border-strong bg-canvas text-foreground-secondary"
      }`}
    >
      <p className="font-medium text-foreground">Listing credits</p>
      <p className="mt-1">
        <span className="font-semibold">{entitlements.listingCredits}</span>{" "}
        unused credit{entitlements.listingCredits === 1 ? "" : "s"} ·{" "}
        <span className="font-semibold">{entitlements.activeJobCount}</span> of{" "}
        <span className="font-semibold">{entitlements.maxActiveJobSlots}</span>{" "}
        active slots used ·{" "}
        <span className="font-semibold">{entitlements.slotsRemaining}</span>{" "}
        remaining
      </p>
      <p className="mt-1 text-xs text-muted">
        Your first concurrent active job is free. Each extra active posting needs
        a listing credit ({creditPrice}).
      </p>
      {atLimit && (
        <Link
          href="/employers/pricing"
          className="mt-2 inline-block text-xs font-semibold text-warning-text underline hover:no-underline"
        >
          Buy listing credits →
        </Link>
      )}
    </div>
  );
}

