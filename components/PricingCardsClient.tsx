"use client";

import dynamic from "next/dynamic";

const PricingCards = dynamic(() => import("@/components/PricingCards"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto grid max-w-5xl animate-pulse grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-96 rounded-2xl border border-border-strong bg-surface-muted" />
      ))}
    </div>
  ),
});

export default PricingCards;
