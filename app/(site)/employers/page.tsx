import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import MarketingCtaBand from "@/components/MarketingCtaBand";
import EmployerPortalLink from "@/components/EmployerPortalLink";
import EmployersMarketingCtas from "@/components/EmployersMarketingCtas";
import EmployersPlanHighlightsSection from "@/components/EmployersPlanHighlightsSection";

export const metadata = {
  title: "For Employers — Waks",
  description:
    "Post jobs to thousands of candidates. Manage your hiring pipeline with Waks.",
};

export default async function EmployersPage() {
  const { userId, orgId } = await auth();

  return (
    <div className="min-h-screen bg-surface">
      {/* ─── Nav ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D]" />
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Waks
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/jobs"
              className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              Find Jobs
            </Link>
            <Link
              href="/employers"
              className="text-sm font-medium text-foreground"
            >
              For Employers
            </Link>
            <Link
              href="/employers/pricing"
              className="text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {userId || orgId ? (
              <EmployerPortalLink
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
              />
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[#4CAF7D] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d9e6e]"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ─────────────────────────────────────────── */}
        <section className="bg-cream px-6 pb-24 pt-20 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4CAF7D]/30 bg-[#4CAF7D]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#3d9e6e]">
              For Employers
            </div>
            <h1 className="mb-5 text-5xl font-extrabold leading-tight tracking-tight text-foreground sm:text-6xl">
              Post jobs to thousands
              <br />
              of candidates
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted">
              Create your company workspace, publish openings in minutes, and
              manage your entire hiring pipeline — all in one place.
            </p>
            <EmployersMarketingCtas variant="hero" />
            <p className="mt-5 text-xs text-muted-foreground">
              Free to start · No credit card required · Cancel anytime
            </p>
          </div>
        </section>

        {/* ─── Stats strip ──────────────────────────────────── */}
        <section className="border-y border-border bg-surface py-10">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-around gap-8 px-6">
            {[
              { value: "10,000+", label: "Active candidates" },
              { value: "500+", label: "Companies hiring" },
              { value: "< 5 min", label: "Time to post a job" },
              { value: "Free", label: "To get started" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features ─────────────────────────────────────── */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold text-foreground">
                Everything you need to hire faster
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
                From posting your first job to managing a full hiring pipeline,
                Waks has you covered.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 11h8v2H8zm0 4h8v2H8zm0-8h3v2H8z" />
                    </svg>
                  ),
                  color: "bg-info-bg text-info-text",
                  title: "Post & manage jobs",
                  desc: "Create detailed job listings with salary ranges, location, and employment type. Save as draft or publish instantly.",
                },
                {
                  icon: (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  ),
                  color: "bg-[#4CAF7D]/10 text-[#3d9e6e]",
                  title: "Review applications",
                  desc: "Receive cover letters and resumes directly in your dashboard. See every candidate at a glance.",
                },
                {
                  icon: (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  ),
                  color: "bg-purple-50 text-purple-500",
                  title: "Applicant tracking",
                  desc: "Move candidates through stages — reviewed, shortlisted, hired. Full ATS pipeline on the Pro plan.",
                },
                {
                  icon: (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  color: "bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400",
                  title: "Team collaboration",
                  desc: "Invite teammates to your organization. Everyone shares the same hiring workspace and job listings.",
                },
                {
                  icon: (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  ),
                  color: "bg-orange-50 text-orange-500",
                  title: "Featured listings",
                  desc: "Boost your job to the top of search results and attract 3× more applicants. Available on Starter+.",
                },
                {
                  icon: (
                    <svg
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  ),
                  color: "bg-danger-bg text-danger-text",
                  title: "Org-level billing",
                  desc: "One subscription for the whole team. Upgrade or downgrade at any time. Full Stripe-powered checkout.",
                },
              ].map(({ icon, color, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
                  >
                    {icon}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─────────────────────────────────── */}
        <section className="bg-cream px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-14 text-center text-3xl font-bold text-foreground">
              Up and running in minutes
            </h2>
            <div className="relative flex flex-col items-start justify-center gap-8 sm:flex-row sm:gap-0">
              <div className="absolute left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] top-[28px] hidden border-t-2 border-dashed border-border-strong sm:block" />
              {[
                {
                  step: "1",
                  title: "Create your org",
                  desc: "Sign up, create a Clerk organization for your company, and invite your team.",
                },
                {
                  step: "2",
                  title: "Post a job",
                  desc: "Fill in the job details, set salary, location, and publish — or save as a draft first.",
                },
                {
                  step: "3",
                  title: "Review & hire",
                  desc: "Candidates apply directly. Review applications, update statuses, and hire the best fit.",
                },
              ].map(({ step, title, desc }) => (
                <div
                  key={step}
                  className="relative z-10 flex flex-1 flex-col items-center px-6 text-center"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-lg font-bold text-white shadow-md">
                    {step}
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <EmployersPlanHighlightsSection
          userId={userId ?? null}
          orgId={orgId ?? null}
        />

        {/* ─── Testimonial / trust strip ────────────────────── */}
        <section className="bg-cream px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6">
            {[
              {
                quote:
                  '"We posted our first job in under 5 minutes and had 20+ applicants by end of day. The ATS pipeline on Pro is a game-changer for our small team."',
                name: "Sarah Chen",
                role: "Head of Talent @ Veritas Labs",
                initials: "SC",
                gradient: "from-violet-400 to-purple-600",
              },
              {
                quote:
                  '"Waks replaced three separate tools for us. Posting, tracking, and communicating with candidates all in one place saves us hours every week."',
                name: "James Okafor",
                role: "Founder @ Buildstack",
                initials: "JO",
                gradient: "from-[#4CAF7D] to-emerald-600",
              },
            ].map(({ quote, name, role, initials, gradient }) => (
              <div
                key={name}
                className="rounded-2xl bg-surface p-6 shadow-sm border border-border"
              >
                <p className="mb-4 text-sm leading-relaxed text-foreground-secondary">
                  {quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {name}
                    </p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Final CTA ────────────────────────────────────── */}
        <MarketingCtaBand
          title="Ready to find your next great hire?"
          description="Join hundreds of companies already hiring on Waks. Free to start, no credit card needed."
        >
          <EmployersMarketingCtas variant="footer" />
        </MarketingCtaBand>
      </main>
    </div>
  );
}
