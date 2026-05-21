import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import PricingCardsClient from "@/components/PricingCardsClient";
import EmployerPortalLink from "@/components/EmployerPortalLink";

export async function generateMetadata(): Promise<Metadata> {
  const { employerBillingEnabled } = await fetchQuery(
    api.sitePublic.employerBillingSettings
  );

  if (!employerBillingEnabled) {
    return {
      title: "Free during launch — Waks",
      description:
        "Post unlimited jobs and use full Hiring Pro features free during the Waks launch period.",
    };
  }

  return {
    title: "Pricing — Waks",
    description:
      "Simple, transparent pricing for employers posting jobs on Waks.",
  };
}

const PAID_TRUST_STRIP = [
  { value: "Free to start", label: "No credit card required" },
  { value: "Cancel anytime", label: "No long-term contracts" },
  { value: "Instant access", label: "Post your first job in minutes" },
] as const;

const LAUNCH_TRUST_STRIP = [
  { value: "Free during launch", label: "No credit card required" },
  { value: "Unlimited jobs", label: "Post as many roles as you need" },
  { value: "Instant access", label: "Start hiring in minutes" },
] as const;

const PAID_FAQ = [
  {
    q: "How do listing credits work?",
    a: "Your first active job is always free. Each additional concurrent active job needs one listing credit (KES 1,000 or about $8 by card, or buy a pack of five for KES 4,000 / about $32). Credits are used when you publish — closing a job frees the slot but does not refund the credit.",
  },
  {
    q: "What is Hiring Pro?",
    a: "Hiring Pro is a monthly subscription (KES 3,500 via M-Pesa) for ATS pipeline, analytics, screening questions, talent pool, and webhooks. It does not include unlimited job posts — buy listing credits separately as you hire.",
  },
  {
    q: "What happens to my jobs if I run out of credits?",
    a: "Existing active jobs stay live. You cannot publish another active job until you close one or purchase a listing credit.",
  },
  {
    q: "How does billing work for organizations?",
    a: "Billing is at the organization level. Listing credits and Hiring Pro apply to everyone in your Clerk organization workspace.",
  },
] as const;

const LAUNCH_FAQ = [
  {
    q: "What's included during the launch period?",
    a: "Everything. Unlimited job posts, the full ATS pipeline, hiring analytics, screening questions, talent pool, webhooks, interview scheduling, and featured listings — all at no cost while we grow the employer community.",
  },
  {
    q: "Is there a limit on how many jobs I can post?",
    a: "No. During launch you can publish as many concurrent active jobs as you need. There are no listing credits or slot limits.",
  },
  {
    q: "Will I be charged later?",
    a: "Not during launch. Paid plans will be introduced after the launch period. We'll notify employers before billing starts so you can decide how to continue.",
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No. Create your organization, post jobs, and use every hiring tool without entering payment details during launch.",
  },
] as const;

export default async function PricingPage() {
  const { userId, orgId, has } = await auth();
  const { employerBillingEnabled } = await fetchQuery(
    api.sitePublic.employerBillingSettings
  );

  const currentPlan: "free" | "starter" | "pro" | null = orgId
    ? has({ plan: "pro" })
      ? "pro"
      : has({ plan: "starter" })
        ? "starter"
        : "free"
    : null;

  const trustStrip = employerBillingEnabled ? PAID_TRUST_STRIP : LAUNCH_TRUST_STRIP;
  const faq = employerBillingEnabled ? PAID_FAQ : LAUNCH_FAQ;

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D]" />
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Waks
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/employers"
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              ← For Employers
            </Link>
            {(orgId || userId) && (
              <EmployerPortalLink className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700" />
            )}
          </div>
        </div>
      </header>

      <section className="px-6 pb-8 pt-20 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4CAF7D]/30 bg-[#4CAF7D]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#3d9e6e]">
            {employerBillingEnabled ? "Pricing" : "Launch offer"}
          </div>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {employerBillingEnabled
              ? "Simple, transparent pricing"
              : "Hire for free during our launch"}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted">
            {employerBillingEnabled
              ? "Post your first job free. Pay per extra listing, or subscribe to Hiring Pro for ATS and analytics."
              : "Unlimited job posts and every Hiring Pro feature — ATS, analytics, talent pool, and more — at no cost while we grow."}
          </p>
          {employerBillingEnabled && currentPlan && (
            <p className="mt-4 text-sm text-muted-foreground">
              Your organization is currently on the{" "}
              <span className="font-semibold capitalize text-foreground-secondary">
                {currentPlan}
              </span>{" "}
              plan.
            </p>
          )}
          {!employerBillingEnabled && orgId && (
            <p className="mt-4 text-sm text-[#3d9e6e]">
              You have full access during launch — post jobs and use every
              hiring tool at no cost.
            </p>
          )}
        </div>
      </section>

      <PricingCardsClient
        userId={userId ?? null}
        orgId={orgId ?? null}
        currentPlan={currentPlan}
      />

      <section className="border-t border-border bg-surface-muted py-10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-around gap-6 px-6 text-center">
          {trustStrip.map(({ value, label }) => (
            <div key={value}>
              <p className="text-sm font-semibold text-foreground">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faq.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-xl border border-border-strong bg-surface p-5 shadow-sm"
              >
                <h3 className="mb-1.5 font-semibold text-foreground">{q}</h3>
                <p className="text-sm leading-relaxed text-muted">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
