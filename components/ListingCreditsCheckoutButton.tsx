"use client";

import { useState } from "react";
import type { ListingProductSlug } from "@/lib/billingCatalog";

type Props = {
  product: ListingProductSlug;
  clerkOrgId: string;
  returnPath?: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
};

export default function ListingCreditsCheckoutButton({
  product,
  clerkOrgId,
  returnPath,
  className,
  children,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          product,
          clerkOrgId,
          returnPath,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start card checkout");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not start card checkout";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        className={className}
      >
        {loading ? "Redirecting…" : children}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
