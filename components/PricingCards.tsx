"use client";

import { CheckoutButton, usePlans } from "@clerk/nextjs/experimental";
import { SignUpButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatKesFromMinorUnits,
  formatUsdFromMinorUnits,
  KES_LISTING_PACK_5_MINOR,
  KES_LISTING_SINGLE_MINOR,
  KES_PRO_MONTHLY_MINOR,
  LISTING_PACK_CREDITS,
  USD_LISTING_PACK_5_MINOR,
  USD_LISTING_SINGLE_MINOR,
  USD_PRO_MONTHLY_MINOR,
  type ListingProductSlug,
  type MpesaProductSlug,
} from "@/lib/billingCatalog";
import ListingCreditsMpesaModal from "@/components/ListingCreditsMpesaModal";
import ListingCreditsPaywallModal from "@/components/ListingCreditsPaywallModal";
import PricingLaunchView from "@/components/PricingLaunchView";
import PricingCardsSkeleton from "@/components/PricingCardsSkeleton";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";
import {
  resolveAccessTier,
  hasHiringProSubscription,
  type OrgPlanSlug,
} from "@/lib/orgPlan";

const CHECK_ICON = (
  <svg
    className="h-4 w-4 flex-shrink-0 text-[#4CAF7D]"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

interface Props {
  userId: string | null;
  orgId: string | null;
  currentPlan: "free" | "starter" | "pro" | null;
}

export default function PricingCards({
  userId,
  orgId,
  currentPlan: initialPlan,
}: Props) {
  const { data: clerkPlans } = usePlans({ for: "organization" });
  const { has } = useAuth();
  const router = useRouter();
  const syncPlan = useMutation(api.organizations.updatePlanFromClient);

  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const entitlements = useQuery(
    api.organizations.getListingEntitlements,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const now = useTickerNow();
  const employerBillingEnabled = useEmployerBillingEnabled();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mpesa">("card");
  const [mpesaProduct, setMpesaProduct] = useState<MpesaProductSlug | null>(
    null
  );
  const [listingPaywall, setListingPaywall] = useState<{
    product: ListingProductSlug;
    method: "card" | "mpesa";
  } | null>(null);

  const clerkPlan: OrgPlanSlug | null =
    orgId && has
      ? has({ plan: "pro" })
        ? "pro"
        : has({ plan: "starter" })
          ? "starter"
          : "free"
      : initialPlan;

  const currentPlan = useMemo(() => {
    if (!orgId) return initialPlan;
    if (convexOrg === undefined) return clerkPlan ?? initialPlan;
    if (convexOrg === null) return clerkPlan ?? initialPlan ?? "free";
    return resolveAccessTier(
      convexOrg.plan,
      convexOrg.subscriptionExpiresAt,
      now,
      employerBillingEnabled ?? true
    );
  }, [orgId, convexOrg, clerkPlan, initialPlan, now, employerBillingEnabled]);

  const hasPro =
    currentPlan !== null &&
    currentPlan !== undefined &&
    hasHiringProSubscription(currentPlan as OrgPlanSlug);

  const clerkProPlan = clerkPlans?.find((p) => p.name.toLowerCase() === "pro");
  const clerkProPlanId = clerkProPlan?.id;

  function handleProCheckoutComplete() {
    if (orgId) {
      void syncPlan({ clerkOrgId: orgId, plan: "pro" })
        .then(() => router.refresh())
        .catch(console.error);
    } else {
      router.refresh();
    }
  }

  const listingSingleLabel =
    paymentMethod === "card"
      ? formatUsdFromMinorUnits(USD_LISTING_SINGLE_MINOR)
      : formatKesFromMinorUnits(KES_LISTING_SINGLE_MINOR);
  const listingPackLabel =
    paymentMethod === "card"
      ? formatUsdFromMinorUnits(USD_LISTING_PACK_5_MINOR)
      : formatKesFromMinorUnits(KES_LISTING_PACK_5_MINOR);
  const proMonthlyLabel = formatKesFromMinorUnits(KES_PRO_MONTHLY_MINOR);
  const proCardPriceLabel =
    paymentMethod === "mpesa"
      ? proMonthlyLabel
      : clerkProPlan?.fee
        ? `${clerkProPlan.fee.currencySymbol}${clerkProPlan.fee.amountFormatted}`
        : formatUsdFromMinorUnits(USD_PRO_MONTHLY_MINOR);
  const listingPaymentFeature =
    paymentMethod === "card" ? "Card checkout (USD)" : "M-Pesa STK push";

  if (employerBillingEnabled === undefined) {
    return <PricingCardsSkeleton />;
  }

  if (employerBillingEnabled === false) {
    return <PricingLaunchView userId={userId} orgId={orgId} />;
  }

  return (
    <>
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-6 pb-8">
        <p className="text-center text-sm text-muted">
          Pay per job listing or subscribe to Hiring Pro for ATS and
          analytics. Use card (USD) or M-Pesa (KES) for listing credits and
          Hiring Pro.
        </p>
        <div className="flex rounded-xl border border-border-strong bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              paymentMethod === "card"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            Card (Stripe)
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("mpesa")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              paymentMethod === "mpesa"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground-secondary"
            }`}
          >
            M-Pesa (KES)
          </button>
        </div>
      </div>

      {/* Job listings */}
      <section className="mx-auto max-w-5xl px-6 pb-12">
        <h2 className="mb-2 text-center text-sm font-bold uppercase tracking-widest text-muted">
          Job listings
        </h2>
        <p className="mb-8 text-center text-sm text-muted">
          One active job free. Each extra concurrent posting is a one-time
          listing credit.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <ListingCard
            name="Free"
            price="KES 0"
            note="Always free"
            features={[
              "1 active job posting",
              "Unlimited applications",
              "Basic candidate inbox",
              "Waks job board listing",
            ]}
            borderClass="border-border-strong"
            headerClass="bg-gradient-to-br from-surface-muted to-surface"
            accentColor="text-muted"
            button={
              !userId ? (
                <SignUpButton
                  mode="modal"
                  forceRedirectUrl="/onboarding/company"
                >
                  <button
                    type="button"
                    className="block w-full rounded-xl bg-gray-900 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    Get started free
                  </button>
                </SignUpButton>
              ) : orgId ? (
                <span className="block w-full rounded-xl border border-border-strong bg-surface-muted py-2.5 text-center text-sm font-semibold text-muted-foreground">
                  {entitlements && entitlements.activeJobCount >= 1
                    ? "Free slot in use"
                    : "Included"}
                </span>
              ) : (
                <Link
                  href="/onboarding/company"
                  className="block w-full rounded-xl bg-gray-900 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-700"
                >
                  Create organization
                </Link>
              )
            }
          />
          <ListingCard
            name="Extra listing"
            price={listingSingleLabel}
            note="Per concurrent active job"
            badge="Pay as you hire"
            features={[
              "1 additional active job slot",
              "Consumed when you publish",
              "Keep slot until you close the job",
              listingPaymentFeature,
            ]}
            borderClass="border-[#4CAF7D]/40 ring-1 ring-[#4CAF7D]/30"
            headerClass="bg-gradient-to-br from-success-bg to-surface"
            accentColor="text-[#3d9e6e]"
            button={
              !orgId ? (
                <span className="block w-full rounded-xl border border-border-strong py-2.5 text-center text-sm text-muted">
                  Sign in to purchase
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setListingPaywall({
                      product: "listing_single",
                      method: paymentMethod === "mpesa" ? "mpesa" : "card",
                    })
                  }
                  className="block w-full rounded-xl bg-[#4CAF7D] py-2.5 text-sm font-semibold text-white hover:bg-[#3d9e6e]"
                >
                  {paymentMethod === "mpesa"
                    ? "Buy 1 credit — M-Pesa"
                    : "Buy 1 credit — card"}
                </button>
              )
            }
          />
          <ListingCard
            name="Listing pack"
            price={listingPackLabel}
            note={`${LISTING_PACK_CREDITS} credits · save 20%`}
            features={[
              `${LISTING_PACK_CREDITS} extra active job slots`,
              "Best for hiring multiple roles",
              "Credits never expire",
              listingPaymentFeature,
            ]}
            borderClass="border-info-border"
            headerClass="bg-gradient-to-br from-info-bg to-surface"
            accentColor="text-blue-600"
            button={
              !orgId ? (
                <span className="block w-full rounded-xl border border-border-strong py-2.5 text-center text-sm text-muted">
                  Sign in to purchase
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setListingPaywall({
                      product: "listing_pack_5",
                      method: paymentMethod === "mpesa" ? "mpesa" : "card",
                    })
                  }
                  className="block w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {paymentMethod === "mpesa" ? "Buy pack — M-Pesa" : "Buy pack — card"}
                </button>
              )
            }
          />
        </div>
        {orgId && entitlements && !entitlements.legacyUnlimitedListings && (
          <p className="mt-6 text-center text-sm text-muted">
            Your org: {entitlements.activeJobCount} active job
            {entitlements.activeJobCount === 1 ? "" : "s"} ·{" "}
            {entitlements.listingCredits} unused listing credit
            {entitlements.listingCredits === 1 ? "" : "s"} · up to{" "}
            {entitlements.maxActiveJobSlots} concurrent actives
          </p>
        )}
      </section>

      {/* Hiring Pro */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="mb-2 text-center text-sm font-bold uppercase tracking-widest text-purple-600 dark:text-purple-300">
          Hiring Pro
        </h2>
        <p className="mb-8 text-center text-sm text-muted">
          Monthly subscription for ATS, analytics, and team workflow. Does not
          include unlimited job posts — buy listing credits as needed.
        </p>
        <div className="relative flex flex-col rounded-2xl border border-purple-200 bg-surface shadow-md ring-1 ring-purple-300 dark:border-purple-800/50 dark:ring-purple-800/30">
          {hasPro && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex rounded-full bg-[#4CAF7D]/10 px-3 py-1 text-xs font-bold text-[#3d9e6e]">
                Active on your org
              </span>
            </div>
          )}
          <div className="rounded-t-2xl bg-gradient-to-br from-purple-100 to-surface px-6 pb-6 pt-8 dark:from-purple-950/50 dark:to-surface">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-300">
              Hiring Pro
            </p>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-4xl font-extrabold text-foreground">
                {proCardPriceLabel}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paymentMethod === "card"
                ? "USD via Stripe"
                : "KES via M-Pesa"}
            </p>
          </div>
          <div className="flex flex-1 flex-col px-6 pb-6">
            <ul className="mb-6 space-y-3">
              {[
                "Full ATS pipeline & Kanban",
                "Shortlist, hire & employer notes",
                "Hiring analytics & exports",
                "Screening questions",
                "Talent pool & webhooks",
                "Interview scheduling",
              ].map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-muted"
                >
                  {CHECK_ICON}
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {hasPro ? (
              <span className="block w-full rounded-xl border border-border-strong bg-surface-muted py-2.5 text-center text-sm font-semibold text-muted-foreground">
                Current plan
              </span>
            ) : !userId ? (
              <SignUpButton
                mode="modal"
                forceRedirectUrl="/onboarding/company?plan=pro"
              >
                <button
                  type="button"
                  className="block w-full rounded-xl bg-purple-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Get started
                </button>
              </SignUpButton>
            ) : !orgId ? (
              <Link
                href="/onboarding/company?plan=pro"
                className="block w-full rounded-xl bg-purple-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-purple-700"
              >
                Subscribe
              </Link>
            ) : paymentMethod === "mpesa" ? (
              <button
                type="button"
                onClick={() => setMpesaProduct("pro_monthly")}
                className="block w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Pay with M-Pesa
              </button>
            ) : clerkProPlanId ? (
              <CheckoutButton
                planId={clerkProPlanId}
                planPeriod="month"
                for="organization"
                onSubscriptionComplete={handleProCheckoutComplete}
              >
                <button
                  type="button"
                  className="block w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Pay with card
                </button>
              </CheckoutButton>
            ) : (
              <span className="block w-full rounded-xl bg-surface-muted py-2.5 text-center text-sm text-muted-foreground">
                Loading checkout…
              </span>
            )}
          </div>
        </div>
        {currentPlan === "starter" && (
          <p className="mt-4 text-center text-xs text-amber-700">
            Your organization is on a legacy Starter plan with unlimited listings
            until you change plans.
          </p>
        )}
      </section>

      {listingPaywall && orgId && (
        <ListingCreditsPaywallModal
          title={
            listingPaywall.product === "listing_single"
              ? "Buy 1 listing credit"
              : `Buy ${LISTING_PACK_CREDITS} listing credits`
          }
          description="Credits are added to your organization when payment confirms."
          product={listingPaywall.product}
          clerkOrgId={orgId}
          returnPath="/employers/pricing"
          initialMethod={listingPaywall.method}
          onClose={() => setListingPaywall(null)}
          onSuccess={() => setListingPaywall(null)}
        />
      )}

      {mpesaProduct === "pro_monthly" && orgId && (
        <ListingCreditsMpesaModal
          title="Hiring Pro — monthly"
          description="Unlock ATS, analytics, and team hiring tools for 30 days."
          product={mpesaProduct}
          amountLabel={formatKesFromMinorUnits(KES_PRO_MONTHLY_MINOR)}
          clerkOrgId={orgId}
          onClose={() => setMpesaProduct(null)}
          onSuccess={() => setMpesaProduct(null)}
        />
      )}
    </>
  );
}

function ListingCard({
  name,
  price,
  note,
  badge,
  features,
  borderClass,
  headerClass,
  accentColor,
  button,
}: {
  name: string;
  price: string;
  note: string;
  badge?: string;
  features: string[];
  borderClass: string;
  headerClass: string;
  accentColor: string;
  button: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-surface shadow-sm ${borderClass}`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex rounded-full bg-success-bg border border-success-border px-3 py-1 text-xs font-bold text-success-text">
            {badge}
          </span>
        </div>
      )}
      <div className={`rounded-t-2xl px-6 pb-6 pt-8 ${headerClass}`}>
        <p className={`text-xs font-bold uppercase tracking-widest ${accentColor}`}>
          {name}
        </p>
        <div className="mt-2 flex items-end gap-1">
          <span className="text-3xl font-extrabold text-foreground">{price}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6">
        <ul className="mb-6 flex-1 space-y-2.5">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 text-sm text-muted"
            >
              {CHECK_ICON}
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {button}
      </div>
    </div>
  );
}
