"use client";

import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";

/**
 * Lightweight first-party analytics (Convex). Debounced per navigation.
 */
export default function SiteAnalyticsBeacon() {
  const pathname = usePathname();
  const record = useMutation(api.siteAnalytics.recordPageView);
  const lastRecorded = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;

    const path = pathname || "/";

    if (lastRecorded.current === path) return;

    const t = window.setTimeout(() => {
      lastRecorded.current = path;
      record({ path }).catch(() => {
        lastRecorded.current = null;
      });
    }, 800);

    return () => window.clearTimeout(t);
  }, [pathname, record]);

  return null;
}
