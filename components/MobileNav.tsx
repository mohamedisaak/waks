"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type NavLink = { href: string; label: string };

const DEFAULT_LINKS: NavLink[] = [
  { href: "/jobs", label: "Find Jobs" },
  { href: "/employers", label: "For Employers" },
  { href: "/employers/pricing", label: "Pricing" },
];

/**
 * Mobile-only slide-down navigation. Renders a hamburger toggle that is hidden
 * at `md` and up (where the inline desktop nav takes over). On mobile it also
 * hosts the Sign in / Get Started actions so the header bar stays uncluttered.
 */
export default function MobileNav({
  links = DEFAULT_LINKS,
  signUpHref = "/sign-up",
  signUpLabel = "Get Started",
}: {
  links?: NavLink[];
  signUpHref?: string;
  signUpLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const showAuthActions = isLoaded && !isSignedIn;

  const close = () => setOpen(false);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape and lock body scroll while the menu is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="relative z-50 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        {open ? (
          <svg
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 6h14M3 10h14M3 14h14" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Full-screen invisible overlay: a tap anywhere off the panel closes
              the menu. Transparent so nothing on the page looks greyed out. */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          {/* Slide-down panel */}
          <div
            id="mobile-nav-panel"
            className="absolute inset-x-0 top-full z-40 border-b border-border bg-surface shadow-lg"
          >
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
              {links.map(({ href, label }) => {
                const active =
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={`rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                      active
                        ? "bg-surface-muted text-foreground"
                        : "text-foreground/80 hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}

              {showAuthActions && (
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                  <Link
                    href="/sign-in"
                    onClick={close}
                    className="rounded-xl px-3 py-3 text-center text-base font-medium text-foreground/80 transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={signUpHref}
                    onClick={close}
                    className="rounded-full bg-[#4CAF7D] px-3 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-[#3d9e6e]"
                  >
                    {signUpLabel}
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
