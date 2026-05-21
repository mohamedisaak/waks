"use client";

import { OrganizationProfile, useClerk } from "@clerk/nextjs";
import { useState } from "react";

export default function ManageBillingButton({ orgId: _orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const { loaded } = useClerk();

  if (!loaded) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-canvas"
      >
        Manage Subscription
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative max-h-[90vh] overflow-auto rounded-xl bg-surface shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted hover:bg-surface-muted"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
            <OrganizationProfile routing="hash" />
          </div>
        </div>
      )}
    </>
  );
}
