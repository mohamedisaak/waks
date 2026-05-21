"use client";

import Link from "next/link";
import { useEmployerBillingEnabled } from "@/hooks/useEmployerBillingEnabled";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  requiredPlan?: "pro";
  className?: string;
}

export default function UpgradePrompt({
  feature,
  description,
  requiredPlan = "pro",
  className = "",
}: UpgradePromptProps) {
  const employerBillingEnabled = useEmployerBillingEnabled();
  if (employerBillingEnabled === false) {
    return null;
  }

  const planLabel = "Hiring Pro";

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/40 p-6 text-center ${className}`}
    >
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">
        {feature} requires the {planLabel} plan
      </h3>
      <p className="mt-1 text-sm text-muted">
        {description ??
          `Unlock ${feature} and more powerful hiring tools by upgrading your organization plan.`}
      </p>
      <Link
        href="/employers/pricing"
        className="mt-4 inline-block rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
      >
        View Plans &amp; Upgrade
      </Link>
    </div>
  );
}
