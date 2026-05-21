"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import EmployerPortalLink from "@/components/EmployerPortalLink";
import { useManagementNav } from "@/hooks/useManagementNav";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";

type Variant = "hero" | "footer";

export default function EmployersMarketingCtas({ variant }: { variant: Variant }) {
  const { userId, orgId, isLoaded } = useAuth();
  const { paths, isPlatformAdmin, isLoading } = useManagementNav();
  const employerBillingEnabled = useEmployerBillingEnabled();

  const secondaryLabel =
    employerBillingEnabled === false
      ? "See what's free"
      : variant === "hero"
        ? "See Pricing"
        : "View Pricing";

  const primaryHero =
    "inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700";
  const primaryFooter =
    "inline-flex items-center gap-2 rounded-full bg-[#4CAF7D] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d9e6e]";
  const secondary =
    "inline-flex items-center gap-2 rounded-full border border-border-strong px-7 py-3 text-sm font-medium text-foreground-secondary transition-colors hover:border-muted";

  if (!isLoaded || isLoading) {
    return <div className="flex flex-col items-center justify-center gap-4 sm:flex-row" />;
  }

  const primaryClass = variant === "hero" ? primaryHero : primaryFooter;

  if (isPlatformAdmin || orgId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link href={paths.home} className={primaryClass}>
          {isPlatformAdmin ? "Go to Admin →" : "Go to Dashboard →"}
        </Link>
        <Link href="/employers/pricing" className={secondary}>
          {secondaryLabel}
        </Link>
      </div>
    );
  }

  if (userId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <EmployerPortalLink
          className={primaryClass}
          setupLabel="Set Up Your Company →"
        />
        <Link href="/employers/pricing" className={secondary}>
          {secondaryLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link
        href={`/sign-up?redirect_url=${encodeURIComponent("/onboarding/company")}`}
        className={primaryClass}
      >
        Get Started Free →
      </Link>
      <Link href="/employers/pricing" className={secondary}>
        {secondaryLabel}
      </Link>
    </div>
  );
}
