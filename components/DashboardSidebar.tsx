"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, useAuth, useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo } from "react";
import { useTickerNow } from "@/hooks/useTickerNow";
import { useOrgAccessTier } from "@/hooks/useEmployerBillingEnabled";
import { type OrgPlanSlug } from "@/lib/orgPlan";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon, exact: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: BriefcaseIcon },
  { href: "/dashboard/applications", label: "Applications", icon: UsersIcon, exact: true },
  { href: "/dashboard/applications/board", label: "Pipeline", icon: FlowIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/dashboard/talent-pool", label: "Talent", icon: TalentIcon },
  { href: "/dashboard/integrations", label: "Webhooks", icon: ZapIcon },
  { href: "/dashboard/settings", label: "Settings & Billing", icon: SettingsIcon },
];

function planBadgeStyle(tier: OrgPlanSlug) {
  if (tier === "pro")
    return {
      label: "Pro",
      color:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    };
  if (tier === "starter")
    return {
      label: "Starter",
      color: "bg-info-bg text-info-text border border-info-border dark:bg-blue-900/40 dark:text-blue-300",
    };
  return {
    label: "Free",
    color:
      "bg-surface-muted text-muted dark:bg-surface-muted dark:text-muted-foreground",
  };
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const now = useTickerNow();
  const { has, orgId } = useAuth();
  const { organization } = useOrganization();
  const upsertOrg = useMutation(api.organizations.upsertOrg);

  const convexOrg = useQuery(
    api.organizations.getByClerkOrgId,
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  const tier = useOrgAccessTier(convexOrg ?? undefined, now);

  const planBadge = useMemo(() => {
    if (!has) return null;
    if (tier) return planBadgeStyle(tier);
    return planBadgeStyle(
      has({ plan: "pro" }) ? "pro" : has({ plan: "starter" }) ? "starter" : "free"
    );
  }, [has, tier]);

  useEffect(() => {
    if (!orgId || !organization) return;
    upsertOrg({
      clerkOrgId: orgId,
      name: organization.name,
      slug: organization.slug ?? orgId,
      logoUrl: organization.imageUrl ?? undefined,
      plan: has({ plan: "pro" }) ? "pro" : has({ plan: "starter" }) ? "starter" : "free",
      createdAt: organization.createdAt?.getTime() ?? Date.now(),
    }).catch(console.error);
  }, [orgId, organization, has, upsertOrg]);

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-border-strong bg-surface">
      {/* Logo */}
      <div className="border-b border-border px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Waks
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-4">
        {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
          const isActive =
            exact === true
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Theme + org switcher + plan badge */}
      <div className="border-t border-border px-3 py-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        {planBadge && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Plan</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${planBadge.color}`}
            >
              {planBadge.label}
            </span>
          </div>
        )}
        <OrganizationSwitcher
          hidePersonal
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full cursor-pointer rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted",
            },
          }}
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
        />
      </div>
    </aside>
  );
}

/* Inline SVG icon components */
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="3" y="12" width="3" height="5" rx="0.75" />
      <rect x="8.5" y="9" width="3" height="8" rx="0.75" />
      <rect x="14" y="5" width="3" height="12" rx="0.75" />
    </svg>
  );
}

function FlowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="4" height="12" rx="1" opacity="0.35" />
      <rect x="8" y="4" width="4" height="12" rx="1" opacity="0.55" />
      <rect x="13" y="4" width="4" height="12" rx="1" />
    </svg>
  );
}

function TalentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M11 3L4 11h6l-1 10 11-13h-6l7-18z" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
