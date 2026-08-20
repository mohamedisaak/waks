"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import UserButtonWithProfile from "@/components/UserButtonWithProfile";
import ThemeToggle from "@/components/ThemeToggle";

const signInClassName =
  "text-sm text-muted hover:text-foreground px-3 py-2 transition-colors";
const signUpClassName =
  "text-sm font-medium bg-[#4CAF7D] text-white px-5 py-2 rounded-full hover:bg-[#3d9e6e] transition-colors";

/** Header auth: plain links until Clerk confirms a session (works even if Clerk JS fails to load). */
export default function AuthHeaderControls({
  signedInExtras,
  signUpLabel = "Get Started",
  signUpHref = "/sign-up",
  collapseOnMobile = false,
}: {
  signedInExtras?: React.ReactNode;
  signUpLabel?: string;
  signUpHref?: string;
  /** Hide the Sign in / Get Started CTAs (and signed-in extras) on mobile,
   *  where a companion mobile menu surfaces them instead. */
  collapseOnMobile?: boolean;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const mobileHidden = collapseOnMobile ? "hidden md:inline-flex" : "";

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {isLoaded && isSignedIn ? (
        <>
          {collapseOnMobile ? (
            <span className="hidden md:contents">{signedInExtras}</span>
          ) : (
            signedInExtras
          )}
          <UserButtonWithProfile />
        </>
      ) : (
        <>
          <Link
            href="/sign-in"
            className={`${signInClassName} ${mobileHidden}`.trim()}
          >
            Sign in
          </Link>
          <Link
            href={signUpHref}
            className={`${signUpClassName} ${mobileHidden}`.trim()}
          >
            {signUpLabel}
          </Link>
        </>
      )}
    </div>
  );
}
