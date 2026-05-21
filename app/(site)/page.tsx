import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import SiteHeaderAuth, { BrowseJobsLink } from "@/components/SiteHeaderAuth";
import HomeMarketingExtras from "@/components/HomeMarketingExtras";
import MarketingCtaBand from "@/components/MarketingCtaBand";
import HiringPortalCta from "@/components/HiringPortalCta";

export default async function Home() {
  const { userId, orgId } = await auth();

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur-sm border-b border-border px-6 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D]" />
              <span className="h-3 w-3 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              Waks
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/jobs"
              className="text-sm font-medium text-foreground/75 hover:text-foreground transition-colors"
            >
              Find Jobs
            </Link>
            <Link
              href="/employers"
              className="text-sm font-medium text-foreground/75 hover:text-foreground transition-colors"
            >
              For Employers
            </Link>
            <Link
              href="/employers/pricing"
              className="text-sm font-medium text-foreground/75 hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Auth */}
          <SiteHeaderAuth signedInExtras={<BrowseJobsLink />} />
        </div>
      </header>

      <main>
        {/* ─── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
          {/* Floating avatar decorations */}
          <div className="pointer-events-none absolute inset-0 select-none">
            {/* Top-left cluster */}
            <div className="absolute top-12 left-[8%] h-14 w-14 rounded-full bg-surface shadow-md ring-2 ring-surface overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                NBI
              </div>
            </div>
            <div className="absolute top-6 left-[18%] h-10 w-10 rounded-full bg-surface shadow-md ring-2 ring-surface overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-bold leading-none">
                KSM
              </div>
            </div>
            <div className="absolute top-32 left-[5%] h-12 w-12 rounded-full bg-surface shadow-md ring-2 ring-surface overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                MSA
              </div>
            </div>
            {/* Dots */}
            <div className="absolute top-16 left-[26%] h-2 w-2 rounded-full bg-[#4CAF7D] opacity-60" />
            <div className="absolute top-28 left-[30%] h-1.5 w-1.5 rounded-full bg-amber-400 opacity-70" />

            {/* Top-right cluster */}
            <div className="absolute top-8 right-[12%] h-14 w-14 rounded-full bg-surface shadow-md ring-2 ring-surface overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                NKR
              </div>
            </div>
            <div className="absolute top-24 right-[6%] h-12 w-12 rounded-full bg-surface shadow-md ring-2 ring-surface overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                WJR
              </div>
            </div>
            <div className="absolute top-4 right-[24%] h-10 w-10 rounded-full bg-surface shadow-md ring-2 ring-surface overflow-hidden">
              <div className="h-full w-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold leading-none">
                GSA
              </div>
            </div>
            <div className="absolute top-20 right-[29%] h-1.5 w-1.5 rounded-full bg-[#4CAF7D] opacity-50" />
            <div className="absolute top-36 right-[18%] h-2 w-2 rounded-full bg-amber-400 opacity-60" />
          </div>

          {/* Hero text */}
          <div className="relative max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground leading-tight tracking-tight mb-5">
              Find &amp; Hire
              <br />
              Experts for any Job
            </h1>
            <p className="text-muted text-lg mb-10 max-w-md mx-auto">
              Jobs &amp; job search. Find jobs in global. Executive jobs &amp;
              work.
            </p>

            {/* Search bar */}
            <form
              action="/jobs"
              method="GET"
              className="bg-surface rounded-2xl shadow-lg border border-border p-2 flex flex-col sm:flex-row gap-0 max-w-xl mx-auto mb-5 overflow-hidden"
            >
              <div className="flex-1 flex flex-col px-3 py-2 border-b sm:border-b-0 sm:border-r border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Employment Type
                </span>
                <select
                  name="employmentType"
                  className="text-sm text-foreground-secondary bg-transparent focus:outline-none mt-0.5"
                >
                  <option value="">All types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Keywords or Title
                </span>
                <input
                  name="search"
                  type="text"
                  placeholder="Design, branding..."
                  className="text-sm text-foreground-secondary bg-transparent focus:outline-none mt-0.5 placeholder:text-muted-foreground"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 bg-[#4CAF7D] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#3d9e6e] transition-colors flex-shrink-0 sm:m-1"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                Search
              </button>
            </form>

            {/* Popular tags */}
            <p className="text-sm text-muted">
              <span className="font-medium">Popular:</span>{" "}
              {["Design", "Art", "Business", "Video Editing"].map((tag, i) => (
                <span key={tag}>
                  <Link
                    href={`/jobs?search=${encodeURIComponent(tag)}`}
                    className="hover:text-[#4CAF7D] transition-colors"
                  >
                    {tag}
                  </Link>
                  {i < 3 && <span className="text-muted-foreground mx-1">,</span>}
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* ─── Trusted Companies ──────────────────────────────── */}
        <section className="bg-surface py-10 border-y border-border">
          <div className="max-w-4xl mx-auto px-6 flex flex-wrap items-center justify-around gap-6">
            {[
              { name: "Google", style: "text-muted-foreground font-light" },
              { name: "Amazon", style: "text-muted-foreground font-light italic" },
              { name: "dribbble", style: "text-muted-foreground font-semibold italic" },
              { name: "slack", style: "text-muted-foreground font-light" },
              { name: "Vina", style: "text-muted-foreground italic" },
              { name: "airbnb", style: "text-muted-foreground font-light" },
            ].map(({ name, style }) => (
              <span key={name} className={`text-lg tracking-tight ${style}`}>
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* ─── How it works ───────────────────────────────────── */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground text-center mb-16">
              How it&apos;s work?
            </h2>
            <div className="relative flex flex-col sm:flex-row items-start justify-center gap-8 sm:gap-0">
              {/* Dashed connector */}
              <div className="hidden sm:block absolute top-[28px] left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] border-t-2 border-dashed border-border-strong z-0" />

              {[
                {
                  icon: (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  ),
                  title: "Create Account",
                  desc: "It's easy to open an account and start your journey.",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 11h8v2H8zm0 4h8v2H8zm0-8h3v2H8z" />
                    </svg>
                  ),
                  title: "Complete your profile",
                  desc: "Complete your profile with all the info to get attention of clients.",
                },
                {
                  icon: (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                  ),
                  title: "Apply job or hire",
                  desc: "Apply & get your preferable jobs with all the requirements and get it.",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="relative z-10 flex-1 flex flex-col items-center text-center px-6"
                >
                  <div className="h-14 w-14 rounded-full bg-[#4CAF7D] text-white flex items-center justify-center mb-4 shadow-md">
                    {icon}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── For Job Seekers ────────────────────────────────── */}
        <section className="py-20 px-6 bg-surface">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#4CAF7D] mb-4">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                </svg>
                For Job Seekers
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Browse jobs &amp; build your career
              </h2>
              <p className="text-muted text-sm leading-relaxed mb-8">
                Search thousands of openings, save the ones you love, and apply
                in minutes. Track every application from one calm dashboard.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  {
                    icon: "🔍",
                    title: "Smart search & filters",
                    desc: "Filter by location, workplace type, employment type, salary, and more.",
                  },
                  {
                    icon: "🔖",
                    title: "Save your favorites",
                    desc: "Bookmark jobs and come back to them anytime from your saved list.",
                  },
                  {
                    icon: "⚡",
                    title: "Apply with one click",
                    desc: "Submit your application with an optional cover letter and track its status in real time.",
                  },
                  {
                    icon: "📄",
                    title: "Profile & resume",
                    desc: "Build your profile, upload resumes, and set your open-to-work status.",
                  },
                ].map(({ icon, title, desc }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 bg-[#4CAF7D] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#3d9e6e] transition-colors"
              >
                Browse all jobs
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </Link>
            </div>

            {/* Right: job card previews */}
            <div className="space-y-3">
              {[
                {
                  title: "Senior Product Designer",
                  company: "Figma",
                  location: "Remote",
                  type: "Full-time",
                  salary: "$120k – $180k",
                },
                {
                  title: "Frontend Engineer",
                  company: "Vercel",
                  location: "San Francisco, CA",
                  type: "Full-time",
                  salary: "$140k – $200k",
                },
                {
                  title: "Marketing Manager",
                  company: "Notion",
                  location: "New York, NY",
                  type: "Contract",
                  salary: "$90k – $130k",
                },
              ].map(({ title, company, location, type, salary }) => (
                <div
                  key={title}
                  className="bg-cream rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {company} · {location}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="rounded-md bg-surface border border-border-strong px-2.5 py-1 text-xs text-muted">
                      {type}
                    </span>
                    <span className="text-sm font-semibold text-foreground-secondary">
                      {salary}
                    </span>
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── For Companies ──────────────────────────────────── */}
        <section className="py-20 px-6 bg-cream">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: stats widget */}
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#4CAF7D]/10 flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-[#4CAF7D]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 14.197l-4.419 2.617A1 1 0 014 16V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    Your Company
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3 active jobs · 12 applicants
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pb-5 border-b border-border mb-5">
                {[
                  { value: "3", label: "Active Jobs" },
                  { value: "12", label: "Applicants" },
                  { value: "4", label: "Team" },
                ].map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Recent Applications
              </p>
              <div className="space-y-2">
                {[
                  { name: "Alex Johnson", role: "Product Designer", status: "shortlisted" },
                  { name: "Sarah Lee", role: "Frontend Engineer", status: "reviewed" },
                  { name: "Mike Chen", role: "Marketing Manager", status: "pending" },
                ].map(({ name, role, status }) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4CAF7D] to-emerald-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {name}
                        </p>
                        <p className="text-xs text-muted-foreground">{role}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                        status === "shortlisted"
                          ? "bg-purple-100 text-purple-700"
                          : status === "reviewed"
                            ? "bg-info-bg text-info-text border border-info-border"
                            : "bg-surface-muted text-muted"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: copy */}
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814L10 14.197l-4.419 2.617A1 1 0 014 16V4z"
                    clipRule="evenodd"
                  />
                </svg>
                For Companies
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Post jobs &amp; hire your next team
              </h2>
              <p className="text-muted text-sm leading-relaxed mb-8">
                Create your company workspace, post openings, review applicants,
                and manage your hiring pipeline as a team.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  {
                    title: "Post & manage listings",
                    desc: "Create job posts with salary, location, tags, and auto-close settings.",
                  },
                  {
                    title: "Review applications",
                    desc: "See cover letters, update statuses, and accept or pass on candidates.",
                  },
                  {
                    title: "Team collaboration",
                    desc: "Invite teammates and manage hiring as an organization.",
                  },
                  {
                    title: "Analytics & reporting",
                    desc: "Track views, click-throughs, and application conversion rates.",
                  },
                ].map(({ title, desc }) => (
                  <li key={title} className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="h-3 w-3 text-orange-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 justify-center">
                <HiringPortalCta
                  className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-gray-700 transition-colors"
                  setupLabel="Set Up Your Company"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 pt-6 pb-14">
          <HomeMarketingExtras />
        </section>

        {/* ─── Final CTA ──────────────────────────────────────── */}
        <MarketingCtaBand
          title="Ready to find your next role?"
          description="Join thousands of professionals who found their dream job through Waks. It's free to apply."
        >
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-full bg-[#4CAF7D] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d9e6e]"
          >
            Browse all jobs →
          </Link>
        </MarketingCtaBand>
      </main>
    </div>
  );
}
