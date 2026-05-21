"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useManagementNav } from "@/hooks/useManagementNav";

type Props = {
  className?: string;
  dashboardLabel?: string;
  setupLabel?: string;
  pricingHref?: string;
  showPricing?: boolean;
};

/** Homepage / employer hiring CTAs with admin vs dashboard routing. */
export default function HiringPortalCta({
  className,
  dashboardLabel = "Go to Dashboard",
  setupLabel,
  pricingHref = "/employers/pricing",
  showPricing = true,
}: Props) {
  const { userId, orgId, isLoaded } = useAuth();
  const { paths, isPlatformAdmin, isLoading } = useManagementNav();

  if (!isLoaded || isLoading) {
    return null;
  }

  if (isPlatformAdmin || orgId) {
    return (
      <Link href={paths.home} className={className}>
        {isPlatformAdmin ? "Go to Admin" : dashboardLabel}
      </Link>
    );
  }

  if (userId) {
    return (
      <>
        <Link
          href="/onboarding/company"
          className={className}
        >
          {setupLabel ?? "Set Up Your Company"}
        </Link>
        {showPricing && (
          <Link
            href={pricingHref}
            className="inline-flex items-center gap-2 text-muted text-sm font-medium px-5 py-3 rounded-full border border-border-strong hover:border-muted transition-colors"
          >
            View Pricing
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      <Link href="/sign-up" className={className}>
        Start Hiring Free
      </Link>
      {showPricing && (
        <Link
          href={pricingHref}
          className="inline-flex items-center gap-2 text-muted text-sm font-medium px-5 py-3 rounded-full border border-border-strong hover:border-muted transition-colors"
        >
          View Pricing
        </Link>
      )}
    </>
  );
}
