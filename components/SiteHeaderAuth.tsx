"use client";

import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import UserButtonWithProfile from "@/components/UserButtonWithProfile";
import ThemeToggle from "@/components/ThemeToggle";

/** Header auth controls — always gated with Clerk SignedIn/SignedOut to avoid modal errors. */
export default function SiteHeaderAuth({
  signedInExtras,
}: {
  /** Shown only when signed in (e.g. Browse Jobs on the marketing homepage). */
  signedInExtras?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <SignedIn>
        {signedInExtras}
        <UserButtonWithProfile />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="text-sm text-muted hover:text-foreground px-3 py-2 transition-colors"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="text-sm font-medium bg-[#4CAF7D] text-white px-5 py-2 rounded-full hover:bg-[#3d9e6e] transition-colors"
          >
            Get Started
          </button>
        </SignUpButton>
      </SignedOut>
    </div>
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
