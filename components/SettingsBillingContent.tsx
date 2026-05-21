"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import ListingCreditsBanner from "@/components/ListingCreditsBanner";
import ManageBillingButton from "@/components/ManageBillingButton";
import {
  type OrgPlanSlug,
} from "@/lib/orgPlan";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useEmployerBillingEnabled, useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import {
  planBadgeFree,
  planBadgePro,
  planBadgeStarter,
} from "@/lib/themeClasses";

const PLAN_FEATURES: Record<
  OrgPlanSlug,
  { name: string; color: string; features: string[] }
> = {
  free: {
    name: "Free",
    color: planBadgeFree,
    features: [
      "1 active job posting",
      "Applicant email notifications",
      "Basic candidate management",
    ],
  },
  starter: {
    name: "Starter",
    color: planBadgeStarter,
    features: [
      "Unlimited job postings",
      "Featured listings",
      "Priority candidate visibility",
      "Email support",
    ],
  },
  pro: {
    name: "Hiring Pro",
    color: planBadgePro,
    features: [
      "ATS pipeline & Kanban",
      "Hiring analytics & exports",
      "Screening questions & talent pool",
      "Webhooks & interview scheduling",
      "Listing credits sold separately",
    ],
  },
};

export default function SettingsBillingContent({
  orgId,
  orgSlug,
}: {
  orgId: string | null;
  orgSlug: string | null;
}) {
  const { has } = useAuth();
  const now = useTickerNow();
  const employerBillingEnabled = useEmployerBillingEnabled();
  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const entitlements = useQuery(
    api.organizations.getListingEntitlements,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const clerkTier: OrgPlanSlug =
    orgId && has
      ? has({ plan: "pro" })
        ? "pro"
        : has({ plan: "starter" })
          ? "starter"
          : "free"
      : "free";

  const effectivePlan: OrgPlanSlug =
    useOrgAccessTier(convexOrg ?? undefined, now) ?? clerkTier;

  const planInfo = PLAN_FEATURES[effectivePlan];

  const expiryNote =
    convexOrg?.subscriptionExpiresAt !== undefined && effectivePlan !== "free"
      ? `Paid access through ${new Date(convexOrg.subscriptionExpiresAt).toLocaleDateString("en-KE")}`
      : null;

  const billingLabel =
    convexOrg?.billingProvider === "mpesa"
      ? "M-Pesa"
      : convexOrg?.billingProvider === "clerk_stripe"
        ? "Card (Clerk / Stripe)"
        : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings &amp; Billing</h1>
        <p className="text-sm text-muted mt-1">
          Manage your organization plan and billing details.
        </p>
      </div>

      <section className="rounded-xl border border-border-strong bg-surface p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-foreground">Current Plan</h2>
            {orgSlug && (
              <p className="text-sm text-muted mt-0.5">Organization: @{orgSlug}</p>
            )}
            {billingLabel && (
              <p className="mt-2 text-xs font-medium text-muted">
                Billing: {billingLabel}
              </p>
            )}
            {expiryNote && (
              <p className="mt-1 text-xs text-muted">{expiryNote}</p>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold shrink-0 ${planInfo.color}`}
          >
            {planInfo.name}
          </span>
        </div>

        {effectivePlan === "free" &&
          employerBillingEnabled !== false &&
          convexOrg &&
          (convexOrg.plan === "starter" || convexOrg.plan === "pro") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              Your subscription period has ended. Renew with card or M-Pesa on the pricing page to restore paid features.
            </div>
          )}

        {entitlements && (
          <ListingCreditsBanner entitlements={entitlements} />
        )}

        <ul className="space-y-2">
          {planInfo.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-foreground-secondary">
              <CheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="pt-2 flex flex-wrap gap-3">
          {employerBillingEnabled === false && (
            <p className="text-sm text-muted">
              Billing is paused during our launch period. All features are included at no cost.
            </p>
          )}
          {employerBillingEnabled !== false && orgId &&
            convexOrg?.billingProvider !== "mpesa" && (
              <ManageBillingButton orgId={orgId} />
            )}
          {employerBillingEnabled !== false && effectivePlan !== "pro" && (
            <Link
              href="/employers/pricing"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Upgrade Plan
            </Link>
          )}
        </div>
      </section>

      {employerBillingEnabled !== false && effectivePlan === "free" && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Unlock More Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LockedFeatureCard
              plan="Listings"
              feature="Extra job slots"
              description="KES 1,000 per concurrent active job beyond your free posting."
            />
            <LockedFeatureCard
              plan="Hiring Pro"
              feature="Applicant Tracking"
              description="Move candidates through a hiring pipeline — screen, interview, hire."
            />
            <LockedFeatureCard
              plan="Hiring Pro"
              feature="Analytics"
              description="Funnel metrics, exports, and team hiring insights."
            />
          </div>
          <Link
            href="/employers/pricing"
            className="inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            View Plans &amp; Pricing →
          </Link>
        </section>
      )}

      {effectivePlan === "starter" && (
        <section className="rounded-xl border border-purple-200 bg-purple-50 p-6 space-y-3">
          <h2 className="font-semibold text-foreground">Upgrade to Pro</h2>
          <p className="text-sm text-muted">
            Get applicant tracking, advanced analytics, and priority support for your whole team.
          </p>
          <Link
            href="/employers/pricing"
            className="inline-block rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
          >
            See Pro Features →
          </Link>
        </section>
      )}

      <section className="rounded-xl border border-border-strong bg-surface p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Organization</h2>
        <p className="text-sm text-muted">
          Manage your organization members, profile, and settings through your Clerk organization profile.
        </p>
        <Link
          href="/dashboard/settings/profile"
          className="text-sm font-medium text-foreground-secondary underline hover:text-foreground"
        >
          Manage organization settings →
        </Link>
      </section>
    </div>
  );
}

function LockedFeatureCard({
  plan,
  feature,
  description,
}: {
  plan: string;
  feature: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-surface p-4">
      <div className="flex items-center gap-2 mb-1">
        <LockIcon className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-amber-600">{plan}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{feature}</p>
      <p className="text-xs text-muted mt-0.5">{description}</p>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
