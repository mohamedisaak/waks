import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthBranding } from "@/components/AuthBranding";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
      <AuthBranding />
      <SignIn />
    </main>
  );
}
