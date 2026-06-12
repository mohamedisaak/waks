import type { Metadata } from "next";
import { AuthBranding } from "@/components/AuthBranding";
import { SignInPanel } from "@/components/ClerkAuthPanel";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
      <AuthBranding />
      <SignInPanel />
    </main>
  );
}
