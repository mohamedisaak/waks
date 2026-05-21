"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ListingProductSlug } from "@/lib/billingCatalog";

function getPublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [locked]);
}

export default function ListingCreditsStripeModal({
  title,
  description,
  amountLabel,
  product,
  clerkOrgId,
  returnPath = "/employers/pricing",
  onClose,
  onSuccess,
}: {
  title: string;
  description: string;
  amountLabel: string;
  product: ListingProductSlug;
  clerkOrgId: string;
  returnPath?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const publishableKey = getPublishableKey();
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishableKey) {
      setError(
        "Card checkout is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local."
      );
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function startEmbeddedCheckout() {
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
            embedded: true,
          }),
        });

        const data = (await res.json()) as {
          clientSecret?: string;
          error?: string;
        };

        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error ?? "Could not start card checkout");
        }

        if (!cancelled) {
          setClientSecret(data.clientSecret);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not start card checkout"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void startEmbeddedCheckout();

    return () => {
      cancelled = true;
    };
  }, [publishableKey, product, clerkOrgId, returnPath]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useBodyScrollLock(mounted);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        type="button"
        aria-label="Close checkout"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-stripe-title"
        className="absolute inset-0 flex flex-col bg-surface sm:inset-x-auto sm:inset-y-4 sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:rounded-2xl sm:shadow-xl"
      >
        <div className="sticky top-0 z-10 flex shrink-0 justify-end bg-surface/95 p-3 backdrop-blur-sm sm:rounded-t-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground ring-1 ring-border-strong hover:bg-surface-muted hover:text-foreground-secondary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <h2 id="listing-stripe-title" className="sr-only">
          {title} · {amountLabel}. {description}
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {loading ? (
            <p className="text-sm text-muted">Loading secure checkout…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : clientSecret && stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: () => {
                  onSuccess?.();
                  router.refresh();
                },
              }}
            >
              <EmbeddedCheckout className="w-full" />
            </EmbeddedCheckoutProvider>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
