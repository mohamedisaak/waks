"use client";

import Link from "next/link";
import { useAuth, useOrganizationList } from "@clerk/nextjs";
import AuthHeaderControls from "./AuthHeaderControls";
import { usePathname } from "next/navigation";
import { useManagementNav } from "@/hooks/useManagementNav";

export default function HomeHeader() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { userMemberships } = useOrganizationList({ userMemberships: true });
  const { paths, isPlatformAdmin, homeLabel, jobsLabel } = useManagementNav();

  // Employer if they have an active org OR belong to any org at all
  const isEmployer = !!orgId || (userMemberships?.data?.length ?? 0) > 0;
  const showManagementNav = isEmployer || isPlatformAdmin;

  const onJobsSection =
    pathname.startsWith("/jobs") || pathname.startsWith("/my-applications");

  return (
    <header className="bg-surface/95 backdrop-blur-sm border-b border-border px-6 py-3.5 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link
            href={showManagementNav ? paths.home : "/"}
            className="flex items-center gap-2"
          >
            <div className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              Waks
            </span>
          </Link>

          {showManagementNav ? (
            /* ── Employer / platform admin nav ── */
            <nav className="flex items-center gap-1">
              <Link
                href={paths.home}
                className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                  pathname === paths.home
                    ? "bg-surface-muted text-foreground"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {homeLabel}
              </Link>
              <Link
                href={paths.jobs}
                className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                  pathname === paths.jobs ||
                  pathname.startsWith(`${paths.jobs}/`)
                    ? "bg-surface-muted text-foreground"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {jobsLabel}
              </Link>
              <Link
                href={paths.applications}
                className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                  pathname === paths.applications ||
                  pathname.startsWith(`${paths.applications}/`)
                    ? "bg-surface-muted text-foreground"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                Applications
              </Link>
            </nav>
          ) : onJobsSection ? (
            /* ── Job-seeker nav (jobs section) ── */
            <nav className="flex items-center gap-1">
              <Link
                href="/jobs"
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                  pathname.startsWith("/jobs")
                    ? "bg-surface-muted text-foreground"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                Jobs
              </Link>
              {isLoaded && isSignedIn && (
                <Link
                  href="/my-applications"
                  className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
                    pathname === "/my-applications"
                      ? "bg-surface-muted text-foreground"
                      : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  Applications
                </Link>
              )}
            </nav>
          ) : (
            /* ── Default marketing nav ── */
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/jobs"
                className="text-sm font-medium text-foreground/75 hover:text-foreground px-4 py-2 rounded-full hover:bg-surface-muted transition-colors"
              >
                Find Jobs
              </Link>
              <Link
                href="/employers"
                className="text-sm font-medium text-foreground/75 hover:text-foreground px-4 py-2 rounded-full hover:bg-surface-muted transition-colors"
              >
                For Employers
              </Link>
            </nav>
          )}
        </div>

        <AuthHeaderControls />
      </div>
    </header>
  );
}
