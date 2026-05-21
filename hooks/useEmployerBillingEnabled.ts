"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import {
  resolveAccessTier,
  type OrgPlanSlug,
} from "@/lib/orgPlan";

export function useEmployerBillingEnabled(): boolean | undefined {
  const settings = useQuery(api.sitePublic.employerBillingSettings);
  if (settings === undefined) return undefined;
  return settings.employerBillingEnabled;
}

export function useOrgAccessTier(
  org:
    | {
        plan: OrgPlanSlug;
        subscriptionExpiresAt?: number;
      }
    | null
    | undefined,
  nowMs: number
): OrgPlanSlug | undefined {
  const billingEnabled = useEmployerBillingEnabled();
  return useMemo(() => {
    if (!org || billingEnabled === undefined) return undefined;
    return resolveAccessTier(
      org.plan,
      org.subscriptionExpiresAt,
      nowMs,
      billingEnabled
    );
  }, [org, billingEnabled, nowMs]);
}
