"use client";

import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import EmployerPortalLink from "@/components/EmployerPortalLink";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";
import { useManagementNav } from "@/hooks/useManagementNav";
import { EMPLOYER_LAUNCH_FEATURES } from "@/lib/employerLaunchFeatures";

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

const PAID_PLANS = [
  {
    name: "Free",
    price: "$0/mo",
    color: "border-border-strong",
    badge: "bg-surface-muted text-foreground-secondary",
    features: [
      "1 active job posting",
      "Unlimited applications",
      "Basic candidate management",
      "Org workspace",
    ],
    cta: "Get started free",
    href: "/sign-up",
    ctaStyle: "bg-gray-900 text-white hover:bg-gray-700",
  },
  {
    name: "Starter",
    price: "$1/mo",
    color: "border-info-border ring-1 ring-blue-200",
    badge: "bg-info-bg text-info-text border border-info-border",
    features: [
      "Unlimited job postings",
      "Featured listings",
      "Priority candidate visibility",
      "Email support",
    ],
    cta: "Get Starter plan",
    href: `/sign-up?redirect_url=${encodeURIComponent("/onboarding/company?plan=starter")}`,
    ctaStyle: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    name: "Pro",
    price: "$2/mo",
    color: "border-purple-200 ring-1 ring-purple-200",
    badge: "bg-purple-100 text-purple-700",
    features: [
      "Everything in Starter",
      "Applicant tracking pipeline",
      "Team analytics",
      "Priority support",
    ],
    cta: "Get Pro plan",
    href: `/sign-up?redirect_url=${encodeURIComponent("/onboarding/company?plan=pro")}`,
    ctaStyle: "bg-purple-600 text-white hover:bg-purple-700",
  },
] as const;

interface Props {
  userId: string | null;
  orgId: string | null;
}

function PlanHighlightsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-2xl border border-border-strong bg-surface-muted"
        />
      ))}
    </div>
  );
}

function LaunchPrimaryCta({
  userId,
  orgId,
}: {
  userId: string | null;
  orgId: string | null;
}) {
  const { paths, isPlatformAdmin, isLoading } = useManagementNav();
  const primaryClass =
    "inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700";

  if (isLoading) {
    return (
      <span className={`${primaryClass} opacity-50 pointer-events-none`}>
        Loading…
      </span>
    );
  }

  if (isPlatformAdmin || orgId) {
    return (
      <Link href={paths.home} className={primaryClass}>
        {isPlatformAdmin ? "Go to Admin →" : "Post a job free →"}
      </Link>
    );
  }

  if (userId) {
    return (
      <EmployerPortalLink
        className={primaryClass}
        setupLabel="Set up your company →"
      />
    );
  }

  return (
    <SignUpButton mode="modal" forceRedirectUrl="/onboarding/company">
      <button type="button" className={primaryClass}>
        Get started free →
      </button>
    </SignUpButton>
  );
}

export default function EmployersPlanHighlightsSection({
  userId,
  orgId,
}: Props) {
  const employerBillingEnabled = useEmployerBillingEnabled();

  if (employerBillingEnabled === undefined) {
    return (
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-3 h-8 w-64 animate-pulse rounded bg-surface-muted" />
            <div className="mx-auto h-4 w-80 animate-pulse rounded bg-surface-muted" />
          </div>
          <PlanHighlightsSkeleton />
        </div>
      </section>
    );
  }

  const launchMode = !employerBillingEnabled;

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-foreground">
            {launchMode
              ? "Everything included — free during launch"
              : "A plan for every stage"}
          </h2>
          <p className="mt-3 text-sm text-muted">
            {launchMode
              ? "Unlimited job posts and full Hiring Pro access while we grow the Waks employer community."
              : "Start for free. Upgrade when you're ready to scale."}
          </p>
        </div>

        {launchMode ? (
          <div className="rounded-2xl border border-[#4CAF7D]/30 bg-gradient-to-br from-success-bg to-surface p-8 shadow-sm sm:p-10">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <LaunchPrimaryCta userId={userId} orgId={orgId} />
              <Link
                href="/employers/pricing#whats-included"
                className="inline-flex items-center justify-center rounded-lg border border-border-strong px-6 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-muted"
              >
                See what&apos;s included
              </Link>
            </div>

            <ul className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              {EMPLOYER_LAUNCH_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-foreground-secondary"
                >
                  {CHECK_ICON}
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-center text-xs text-muted">
              No credit card required. Paid plans will be introduced after the
              launch period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PAID_PLANS.map(
              ({ name, price, color, badge, features, cta, href, ctaStyle }) => (
                <div
                  key={name}
                  className={`rounded-2xl border bg-surface p-6 ${color}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}
                    >
                      {price}
                    </span>
                  </div>
                  <ul className="mb-6 space-y-2">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-muted"
                      >
                        {CHECK_ICON}
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${ctaStyle}`}
                  >
                    {cta}
                  </Link>
                </div>
              )
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {launchMode ? "More details → " : "Full pricing details → "}
          <Link
            href="/employers/pricing"
            className="font-medium text-foreground-secondary underline hover:text-foreground"
          >
            {launchMode ? "See what's free on /employers/pricing" : "/employers/pricing"}
          </Link>
        </p>
      </div>
    </section>
  );
}
