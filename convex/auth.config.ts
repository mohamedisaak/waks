import { AuthConfig } from "convex/server";

const clerkIssuerDomain =
  process.env.CLERK_JWT_ISSUER_DOMAIN?.trim() ??
  "https://gorgeous-gibbon-87.clerk.accounts.dev";

export default {
  providers: [
    {
      // Clerk Dashboard → JWT Templates → "convex" → Issuer
      // Set CLERK_JWT_ISSUER_DOMAIN in Convex env for production deployments.
      domain: clerkIssuerDomain,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
