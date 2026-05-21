"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/financials", label: "Financials" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/job-ingestion", label: "Job ingestion" },
  { href: "/admin/users", label: "Jobseekers" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/analytics", label: "Site traffic" },
  { href: "/admin/monetization", label: "Monetization" },
  { href: "/admin/access", label: "Admins & audit" },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = useQuery(
    api.admin.access.isViewerPlatformAdmin,
    isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (isAdmin === false) router.replace("/");
  }, [isLoaded, isSignedIn, isAdmin, router]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Checking platform access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-muted">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas text-foreground">
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-border-strong bg-surface">
        <div className="border-b border-border px-4 py-4">
          <Link
            href="/admin"
            className="text-sm font-semibold uppercase tracking-wide text-emerald-700"
          >
            Waks Admin
          </Link>
          <p className="mt-1 text-xs text-muted">Platform control</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {LINKS.map(({ href, label }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href + "/") || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`block rounded-md px-2 py-1.5 text-sm ${
                active
                  ? "bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "text-muted hover:bg-canvas"
              }`}
            >
              {label}
            </Link>
          );
        })}
          <hr className="my-3 border-border" />
          <Link
            href="/"
            className="block rounded-md px-2 py-1.5 text-sm text-muted hover:bg-canvas"
          >
            ← Marketing site
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
