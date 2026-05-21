"use client";

import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import EmployerPortalLink from "@/components/EmployerPortalLink";
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

const LAUNCH_FEATURES = EMPLOYER_LAUNCH_FEATURES;

interface Props {
  userId: string | null;
  orgId: string | null;
}

export default function PricingLaunchView({ userId, orgId }: Props) {
  const { paths, isPlatformAdmin, isLoading } = useManagementNav();

  const primaryClass =
    "inline-flex items-center justify-center rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700";
  const secondaryClass =
    "inline-flex items-center justify-center rounded-full border border-border-strong px-7 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:border-muted";

  function PrimaryCta() {
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
      <SignUpButton
        mode="modal"
        forceRedirectUrl="/onboarding/company"
      >
        <button type="button" className={primaryClass}>
          Get started free →
        </button>
      </SignUpButton>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 pb-16">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <PrimaryCta />
        <a href="#whats-included" className={secondaryClass}>
          See what&apos;s included
        </a>
      </div>

      <div
        id="whats-included"
        className="mt-14 scroll-mt-24 rounded-2xl border border-[#4CAF7D]/30 bg-gradient-to-br from-success-bg to-surface p-8 shadow-sm sm:p-10"
      >
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#3d9e6e]">
          Everything included
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          Full hiring platform access — no limits during launch
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted sm:text-base">
          Post as many jobs as you need and use every Hiring Pro tool while we
          grow the Waks employer community. No credit card, no listing credits,
          no subscriptions.
        </p>

        <ul className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
          {LAUNCH_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-foreground-secondary"
            >
              {CHECK_ICON}
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-muted">
          Pricing will be introduced after the launch period. We&apos;ll notify
          employers before anything changes.
        </p>
      </div>
    </section>
  );
}
