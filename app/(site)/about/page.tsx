import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "About Waks",
  description:
    "Waks is a job platform built for East Africa — helping job seekers find roles and employers hire faster.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Waks",
    description:
      "Waks is a job platform built for East Africa — helping job seekers find roles and employers hire faster.",
    url: absoluteUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-foreground">
            Waks
          </Link>
          <Link href="/jobs" className="text-sm text-muted hover:text-foreground">
            Browse jobs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">
          About Waks
        </h1>
        <p className="text-lg text-muted leading-relaxed mb-6">
          Waks connects job seekers and employers across East Africa. We make it
          easy to discover openings in Kenya, Uganda, Tanzania, and beyond —
          whether you are hiring locally or building a remote team.
        </p>
        <div className="space-y-4 text-sm text-foreground-secondary leading-relaxed">
          <p>
            For job seekers, Waks offers a searchable job board, one-click
            applications with your profile, and alerts when new roles match your
            criteria.
          </p>
          <p>
            For employers, Waks provides job posting, applicant tracking,
            analytics, and billing options suited to East African teams — including
            M-Pesa and card payments.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/jobs"
            className="rounded-full bg-[#4CAF7D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d9e6e]"
          >
            Find jobs
          </Link>
          <Link
            href="/employers"
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-surface"
          >
            For employers
          </Link>
        </div>
      </main>
    </div>
  );
}
