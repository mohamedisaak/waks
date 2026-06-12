import type { Metadata } from "next";
import { AuthBranding } from "@/components/AuthBranding";
import { SignUpPanel } from "@/components/ClerkAuthPanel";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const redirectUrl = params["redirect_url"] ?? params["redirectUrl"];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4">
      <AuthBranding />
      <SignUpPanel forceRedirectUrl={redirectUrl} />
    </main>
  );
}
