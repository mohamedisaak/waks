/** Employer org dashboard routes. */
export const DASHBOARD_PATHS = {
  home: "/dashboard",
  jobs: "/dashboard/jobs",
  applications: "/dashboard/applications",
  settings: "/dashboard/settings",
  jobsNew: "/dashboard/jobs/new",
} as const;

/** Platform super-admin routes (parallel sections). */
export const ADMIN_PATHS = {
  home: "/admin",
  jobs: "/admin/jobs",
  applications: "/admin/applications",
  settings: "/admin/access",
  jobsNew: "/admin/jobs",
} as const;

export type ManagementPaths = {
  readonly home: string;
  readonly jobs: string;
  readonly applications: string;
  readonly settings: string;
  readonly jobsNew: string;
};

export function resolveManagementPaths(
  isPlatformAdmin: boolean
): ManagementPaths {
  return isPlatformAdmin ? ADMIN_PATHS : DASHBOARD_PATHS;
}

export function managementHomeLabel(isPlatformAdmin: boolean): string {
  return isPlatformAdmin ? "Admin" : "Dashboard";
}

export function managementJobsLabel(isPlatformAdmin: boolean): string {
  return isPlatformAdmin ? "All jobs" : "My Jobs";
}
