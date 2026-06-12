"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

const LOAD_TIMEOUT_MS = 12_000;

function AuthLoadingSpinner() {
  return (
    <div
      className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-[#4CAF7D]"
      role="status"
      aria-label="Loading sign-in"
    />
  );
}

function AuthLoadError() {
  return (
    <div className="max-w-md rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
      <p className="text-base font-semibold text-foreground">
        Sign-in is temporarily unavailable
      </p>
      <p className="mt-2 text-sm text-muted">
        The authentication service could not load. This usually means Clerk DNS
        records for <span className="font-medium">waks.co.ke</span> are missing
        or still propagating.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Site owners: run{" "}
        <code className="rounded bg-surface-muted px-1.5 py-0.5">
          npm run clerk:dns-check
        </code>{" "}
        and complete DNS setup in the Clerk Dashboard → Configure → Domains.
      </p>
    </div>
  );
}

function useClerkLoadTimeout(isLoaded: boolean) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isLoaded]);

  return timedOut;
}

export function SignInPanel() {
  const { isLoaded } = useAuth();
  const timedOut = useClerkLoadTimeout(isLoaded);

  if (!isLoaded) {
    return timedOut ? <AuthLoadError /> : <AuthLoadingSpinner />;
  }

  return <SignIn />;
}

export function SignUpPanel({
  forceRedirectUrl,
}: {
  forceRedirectUrl?: string;
}) {
  const { isLoaded } = useAuth();
  const timedOut = useClerkLoadTimeout(isLoaded);

  if (!isLoaded) {
    return timedOut ? <AuthLoadError /> : <AuthLoadingSpinner />;
  }

  return <SignUp forceRedirectUrl={forceRedirectUrl} />;
}
