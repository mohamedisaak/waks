import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the Waks job platform.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Waks",
    url: absoluteUrl("/privacy"),
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
            Waks
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-extrabold text-foreground mb-6">
          Privacy Policy
        </h1>
        <div className="space-y-4 text-sm text-foreground-secondary leading-relaxed">
          <p>Last updated: May 2026</p>
          <p>
            Waks collects information you provide when you create an account,
            build a profile, post jobs, or apply to roles. We use this data to
            operate the platform, match candidates with opportunities, and
            communicate about your account.
          </p>
          <p>
            We do not sell personal data. We share application materials with
            employers you apply to, and use service providers (such as hosting,
            email, and payments) under appropriate agreements.
          </p>
          <p>
            You may request access or deletion of your account data by contacting{" "}
            <Link href="/support" className="text-[#4CAF7D] hover:underline">
              support
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
