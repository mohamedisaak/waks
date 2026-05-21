import { loadEnvConfig } from "@next/env";

import type { NextConfig } from "next";

import { tryGetPublicConvexDeploymentUrl } from "./lib/publicConvexDeploymentUrl";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const resolvedConvexDeploymentUrl = tryGetPublicConvexDeploymentUrl();

/**
 * Pins NEXT_PUBLIC_CONVEX_URL for the bundled app. Overrides bogus values such as shell
 * `export NEXT_PUBLIC_CONVEX_URL=...` by resolving from NEXT_PUBLIC_CONVEX_SITE_URL when needed.
 */
const nextConfig: NextConfig = {
  env:
    resolvedConvexDeploymentUrl !== undefined
      ? { NEXT_PUBLIC_CONVEX_URL: resolvedConvexDeploymentUrl }
      : {},
};

export default nextConfig;
