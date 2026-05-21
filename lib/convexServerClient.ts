import { ConvexHttpClient } from "convex/browser";

import { getPublicConvexDeploymentUrl } from "./publicConvexDeploymentUrl";

/**
 * Convex HTTP client for Next.js Route Handlers (no React hooks).
 * Call `client.setAuth(jwt)` when invoking authenticated mutations.
 */
export function getConvexHttpClient(): ConvexHttpClient {
  const url = getPublicConvexDeploymentUrl();
  return new ConvexHttpClient(url);
}
