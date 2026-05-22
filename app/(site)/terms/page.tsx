import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using the Waks job platform.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Waks",
    url: absoluteUrl("/terms"),
  },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>Last updated: May 2026</p>
      <p>
        By using Waks at waks.co.ke, you agree to these terms. Waks provides a
        platform for job listings and applications. Employers are responsible for
        the accuracy of their postings; job seekers are responsible for the
        information in their applications.
      </p>
      <p>
        We may update features, pricing, and these terms over time. Continued use
        of Waks after changes constitutes acceptance of the updated terms.
      </p>
      <p>
        Questions? Contact us via{" "}
        <Link href="/support" className="text-[#4CAF7D] hover:underline">
          support
        </Link>
        .
      </p>
    </LegalShell>
  );
}

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
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
      <main className="mx-auto max-w-3xl px-6 py-16 prose prose-slate max-w-none">
        <h1 className="text-3xl font-extrabold text-foreground mb-6">{title}</h1>
        <div className="space-y-4 text-sm text-foreground-secondary leading-relaxed">
          {children}
        </div>
      </main>
    </div>
  );
}
