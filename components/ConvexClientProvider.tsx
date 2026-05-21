"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

import { getPublicConvexDeploymentUrl } from "@/lib/publicConvexDeploymentUrl";

/** Single client instance; ConvexReactClient should not be recreated every render. */
function useConvexReactClientSingleton(): ConvexReactClient {
  return useMemo(
    () => new ConvexReactClient(getPublicConvexDeploymentUrl()),
    []
  );
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const convex = useConvexReactClientSingleton();

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
