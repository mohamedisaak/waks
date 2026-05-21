"use client";

import { useState } from "react";
import {
  formatKesFromMinorUnits,
  formatUsdFromMinorUnits,
  KES_LISTING_PACK_5_MINOR,
  KES_LISTING_SINGLE_MINOR,
  LISTING_PACK_CREDITS,
  type ListingProductSlug,
  usdMinorUnitsForListingProduct,
} from "@/lib/billingCatalog";
import ListingCreditsMpesaModal from "@/components/ListingCreditsMpesaModal";
import ListingCreditsStripeModal from "@/components/ListingCreditsStripeModal";

type PaymentMethod = "card" | "mpesa";

type Props = {
  title: string;
  description: string;
  product: ListingProductSlug;
  clerkOrgId: string;
  returnPath?: string;
  initialMethod?: PaymentMethod;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function ListingCreditsPaywallModal({
  title,
  description,
  product,
  clerkOrgId,
  returnPath = "/dashboard/jobs/new",
  initialMethod,
  onClose,
  onSuccess,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod | null>(
    initialMethod ?? null
  );

  const kesMinor =
    product === "listing_single"
      ? KES_LISTING_SINGLE_MINOR
      : KES_LISTING_PACK_5_MINOR;
  const kesLabel = formatKesFromMinorUnits(kesMinor);
  const usdLabel = formatUsdFromMinorUnits(
    usdMinorUnitsForListingProduct(product)
  );
  const creditLabel =
    product === "listing_pack_5"
      ? `${LISTING_PACK_CREDITS} listing credits`
      : "1 listing credit";

  if (method === "mpesa") {
    return (
      <ListingCreditsMpesaModal
        title={title}
        description={description}
        product={product}
        amountLabel={kesLabel}
        clerkOrgId={clerkOrgId}
        onClose={() => {
          if (initialMethod) {
            onClose();
          } else {
            setMethod(null);
          }
        }}
        onSuccess={() => {
          onSuccess?.();
        }}
      />
    );
  }

  if (method === "card") {
    return (
      <ListingCreditsStripeModal
        title={title}
        description={description}
        product={product}
        amountLabel={usdLabel}
        clerkOrgId={clerkOrgId}
        returnPath={returnPath}
        onClose={() => {
          if (initialMethod) {
            onClose();
          } else {
            setMethod(null);
          }
        }}
        onSuccess={() => {
          onSuccess?.();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-paywall-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <h2
          id="listing-paywall-title"
          className="text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        <p className="mt-4 text-sm text-muted">
          {creditLabel} · {usdLabel} card or {kesLabel} M-Pesa
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => setMethod("card")}
            className="block w-full rounded-xl bg-[#4CAF7D] py-2.5 text-sm font-semibold text-white hover:bg-[#3d9e6e]"
          >
            Pay with card — {usdLabel}
          </button>
          <button
            type="button"
            onClick={() => setMethod("mpesa")}
            className="block w-full rounded-xl border border-border-strong py-2.5 text-sm font-semibold text-foreground-secondary hover:bg-surface-muted"
          >
            Pay with M-Pesa — {kesLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="block w-full py-2 text-sm text-muted hover:text-foreground-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
