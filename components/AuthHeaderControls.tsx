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
}: {
  signedInExtras?: React.ReactNode;
  signUpLabel?: string;
  signUpHref?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      {isLoaded && isSignedIn ? (
        <>
          {signedInExtras}
          <UserButtonWithProfile />
        </>
      ) : (
        <>
          <Link href="/sign-in" className={signInClassName}>
            Sign in
          </Link>
          <Link href={signUpHref} className={signUpClassName}>
            {signUpLabel}
          </Link>
        </>
      )}
    </div>
  );
}
