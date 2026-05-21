"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { MpesaProductSlug } from "@/lib/billingCatalog";

function normalizeKenyaMpesaMsisdn(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  let p = digits;
  if (p.startsWith("0")) {
    p = "254" + p.slice(1);
  } else if (p.length === 9 && (p.startsWith("7") || p.startsWith("1"))) {
    p = "254" + p;
  }
  if (!/^254\d{9}$/.test(p)) {
    return null;
  }
  return p;
}

export default function ListingCreditsMpesaModal({
  title,
  description,
  product,
  amountLabel,
  clerkOrgId,
  onClose,
  onSuccess,
}: {
  title: string;
  description: string;
  product: MpesaProductSlug;
  amountLabel: string;
  clerkOrgId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const createPaymentIntent = useMutation(api.mpesaPayments.createPaymentIntent);

  const [phoneInput, setPhoneInput] = useState("");
  const [paymentId, setPaymentId] = useState<Id<"mpesaPayments"> | null>(null);
  const [stkLoading, setStkLoading] = useState(false);
  const [stkError, setStkError] = useState<string | null>(null);
  const refreshedSuccess = useRef(false);

  const payment = useQuery(
    api.mpesaPayments.getMyMpesaPaymentById,
    paymentId ? { paymentId } : "skip"
  );

  useEffect(() => {
    if (!paymentId) return;
    if (
      !payment ||
      payment.status !== "pending" ||
      !payment.checkoutRequestId
    ) {
      return;
    }

    const pid = paymentId;
    let cancelled = false;

    async function reconcileDaraja(): Promise<void> {
      try {
        const res = await fetch("/api/mpesa/stkquery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ paymentId: pid }),
        });
        if (!res.ok || cancelled) return;
        await res.json().catch(() => undefined);
      } catch {
        // ignore
      }
    }

    const FIRST_POLL_MS = 6000;
    let pollIntervalHandle = 0;
    const kickoffHandle = window.setTimeout(() => {
      if (cancelled) return;
      void reconcileDaraja();
      pollIntervalHandle = window.setInterval(() => void reconcileDaraja(), 3800);
    }, FIRST_POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(kickoffHandle);
      if (pollIntervalHandle !== 0) window.clearInterval(pollIntervalHandle);
    };
  }, [paymentId, payment]);

  useEffect(() => {
    if (payment?.status === "success" && !refreshedSuccess.current) {
      refreshedSuccess.current = true;
      onSuccess?.();
      router.refresh();
    }
  }, [payment?.status, router, onSuccess]);

  async function handleSendStk(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeKenyaMpesaMsisdn(phoneInput);
    if (!normalized) {
      setStkError("Enter a valid Kenyan number (e.g. 0712… or 254712…).");
      return;
    }

    setStkError(null);
    setStkLoading(true);
    try {
      const id = await createPaymentIntent({
        clerkOrgId,
        plan: product,
        phoneNumber: normalized,
      });
      setPaymentId(id);

      const res = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setPaymentId(null);
        setStkError(data.error ?? "Could not start STK push.");
      }
    } catch {
      setPaymentId(null);
      setStkError("Something went wrong. Try again in a moment.");
    } finally {
      setStkLoading(false);
    }
  }

  function handleResetAttempt() {
    setPaymentId(null);
    setStkError(null);
    refreshedSuccess.current = false;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground-secondary"
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="pr-8 text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">
          Amount:{" "}
          <span className="font-semibold text-foreground">{amountLabel}</span>
        </p>
        <p className="mt-2 text-sm text-muted">{description}</p>

        <form
          onSubmit={handleSendStk}
          className="mt-5 space-y-3 rounded-xl border border-border-strong p-4"
        >
          <div>
            <label
              className="block text-xs font-medium text-muted"
              htmlFor="listing-mpesa-phone"
            >
              M-Pesa phone number
            </label>
            <input
              id="listing-mpesa-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0712345678 or 254712345678"
              value={phoneInput}
              disabled={
                stkLoading ||
                (payment?.status === "pending" &&
                  payment.checkoutRequestId !== undefined)
              }
              onChange={(e) => setPhoneInput(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 disabled:bg-surface-muted"
            />
          </div>

          {paymentId ? (
            <div className="min-h-[3rem] rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-muted">
              {payment === undefined ? (
                <p>Checking payment status…</p>
              ) : payment?.status === "success" ? (
                <p className="font-semibold text-[#3d9e6e]">
                  Payment received — credits will appear shortly.
                </p>
              ) : payment?.status === "failed" ? (
                <p className="text-red-700">
                  Payment was not completed. Try again below.
                </p>
              ) : (
                <p className="text-blue-900">
                  Approve the M-Pesa prompt on your phone.
                </p>
              )}
            </div>
          ) : null}

          {stkError ? <p className="text-sm text-red-600">{stkError}</p> : null}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={
                stkLoading ||
                payment?.status === "success" ||
                (payment?.status === "pending" &&
                  payment.checkoutRequestId !== undefined)
              }
              className="w-full rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {stkLoading ? "Sending…" : "Pay with M-Pesa"}
            </button>
            {(stkError || payment?.status === "failed") && (
              <button
                type="button"
                onClick={handleResetAttempt}
                className="w-full rounded-xl border border-border-strong py-2.5 text-sm font-semibold text-foreground-secondary hover:bg-surface-muted"
              >
                Try again
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
