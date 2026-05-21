"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useManagementNav } from "@/hooks/useManagementNav";

type Props = {
  className?: string;
  /** Shown when signed in with an org (or as platform admin). */
  signedInLabel?: string;
  /** Shown when signed in without an org. */
  setupLabel?: string;
};

/**
 * Marketing / employer CTAs: platform admins → /admin, org members → /dashboard.
 */
export default function EmployerPortalLink({
  className,
  signedInLabel,
  setupLabel = "Set Up Your Company →",
}: Props) {
  const { userId, orgId, isLoaded } = useAuth();
  const { paths, isPlatformAdmin, isLoading } = useManagementNav();

  if (!isLoaded || isLoading) {
    return (
      <span
        className={className}
        aria-hidden="true"
      >
        &nbsp;
      </span>
    );
  }

  if (!userId) {
    return null;
  }

  if (isPlatformAdmin || orgId) {
    const label =
      signedInLabel ??
      (isPlatformAdmin ? "Go to Admin →" : "Go to Dashboard →");
    return (
      <Link href={paths.home} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <Link href="/onboarding/company" className={className}>
      {setupLabel}
    </Link>
  );
}
