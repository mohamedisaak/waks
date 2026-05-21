"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  managementHomeLabel,
  managementJobsLabel,
  resolveManagementPaths,
} from "@/lib/managementNav";

export function useManagementNav() {
  const { isSignedIn } = useAuth();
  const isPlatformAdmin = useQuery(
    api.admin.access.isViewerPlatformAdmin,
    isSignedIn ? {} : "skip"
  );

  const isAdmin = isPlatformAdmin === true;
  const paths = resolveManagementPaths(isAdmin);

  return {
    paths,
    isPlatformAdmin: isAdmin,
    isLoading: isSignedIn && isPlatformAdmin === undefined,
    homeLabel: managementHomeLabel(isAdmin),
    jobsLabel: managementJobsLabel(isAdmin),
  };
}
