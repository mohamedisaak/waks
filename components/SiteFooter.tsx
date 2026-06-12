import Link from "next/link";

const FOOTER_LINKS = {
  jobSeekers: [
    { href: "/jobs", label: "Browse jobs" },
    { href: "/jobs/kenya", label: "Jobs in Kenya" },
    { href: "/jobs/remote", label: "Remote jobs" },
    { href: "/my-applications", label: "My applications" },
  ],
  employers: [
    { href: "/employers", label: "For employers" },
    { href: "/employers/pricing", label: "Pricing" },
    {
      href: `/sign-up?redirect_url=${encodeURIComponent("/onboarding/company")}`,
      label: "Post a job",
    },
  ],
  company: [
    { href: "/about", label: "About Waks" },
    { href: "/support", label: "Contact support" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
  ],
} as const;

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-cream">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-3 w-3 rounded-full bg-[#4CAF7D]" />
                <span className="h-3 w-3 rounded-full bg-[#4CAF7D] opacity-50" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Waks
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Find your next role across East Africa — or hire great talent on Waks.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Job seekers
            </p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.jobSeekers.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Employers
            </p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.employers.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Company
            </p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.company.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-muted transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border-strong/80 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {year} Waks. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for teams hiring in East Africa and beyond.
          </p>
        </div>
      </div>
    </footer>
  );
}
