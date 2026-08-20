"use client";

import Link from "next/link";
import AuthHeaderControls from "@/components/AuthHeaderControls";

export default function SiteHeaderAuth({
  signedInExtras,
  collapseOnMobile = false,
}: {
  /** Shown only when signed in (e.g. Browse Jobs on the marketing homepage). */
  signedInExtras?: React.ReactNode;
  /** Hide the Sign in / Get Started CTAs on mobile (surfaced in the mobile menu). */
  collapseOnMobile?: boolean;
}) {
  return (
    <AuthHeaderControls
      signedInExtras={signedInExtras}
      collapseOnMobile={collapseOnMobile}
    />
  );
}

export function BrowseJobsLink() {
  return (
    <Link
      href="/jobs"
      className="text-sm font-medium text-foreground-secondary bg-surface-muted px-4 py-2 rounded-full hover:bg-surface-muted transition-colors"
    >
      Browse Jobs
    </Link>
  );
}
