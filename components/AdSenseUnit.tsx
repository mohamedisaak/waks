"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { AdCardFooter, AdFrame } from "@/components/AdFrame";
import { parseAdsenseClientSlot } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSenseUnitProps = {
  clientSlot: string;
  className?: string;
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  /** Dev/debug subtitle inside placeholder (e.g. "Homepage", "Jobs sidebar"). */
  placementLabel?: string;
};

function useAdsensePlaceholderMode() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ADSENSE_SHOW_PLACEHOLDER === "true"
  );
}

function isInsFilled(ins: HTMLModElement | null) {
  if (!ins) return false;
  if (ins.getAttribute("data-ad-status") === "filled") return true;
  return ins.querySelector("iframe") !== null;
}

function CategoryGrid({ compact }: { compact?: boolean }) {
  return (
    <div className={`grid w-full grid-cols-2 ${compact ? "gap-2" : "gap-2.5"}`}>
      {["Remote", "Flexible", "Freelance", "On-site"].map((cat) => (
        <div
          key={cat}
          className={`flex flex-col items-center justify-center rounded-md bg-canvas text-center ${
            compact ? "min-h-[72px] px-2 py-3" : "min-h-[80px] px-3 py-3.5"
          }`}
        >
          <div
            className={`mb-2 rounded-full bg-[#4CAF7D]/15 ${
              compact ? "h-6 w-6" : "h-7 w-7"
            }`}
          />
          <span
            className={`font-medium leading-tight text-muted ${
              compact ? "text-[10px]" : "text-xs"
            }`}
          >
            {cat}
          </span>
        </div>
      ))}
    </div>
  );
}

function AdSensePlaceholderBody({
  placementLabel,
  clientSlot,
  message,
  vertical,
}: {
  placementLabel: string;
  clientSlot: string;
  message: string;
  vertical?: boolean;
}) {
  const copy = (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold leading-snug text-foreground">
        {placementLabel} — sample ad unit
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{message}</p>
      <p className="mt-2 break-all font-mono text-[10px] leading-snug text-muted-foreground">
        {clientSlot}
      </p>
    </div>
  );

  return (
    <>
      <div
        className={
          vertical ?
            "flex min-h-[300px] flex-col gap-4 px-4 py-5"
          : "flex min-h-[160px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-stretch lg:gap-5"
        }
      >
        {vertical ?
          <>
            {copy}
            <CategoryGrid compact />
          </>
        : <>
            <div className="w-full shrink-0 lg:w-[200px]">
              <CategoryGrid />
            </div>
            {copy}
          </>
        }
      </div>
      <AdCardFooter brand="AdSense" />
    </>
  );
}

export function AdSenseUnit({
  clientSlot,
  className = "",
  format = "auto",
  placementLabel = "Ad slot",
}: AdSenseUnitProps) {
  const parsed = parseAdsenseClientSlot(clientSlot);
  const instanceId = useId().replace(/:/g, "");
  const pushed = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);
  const forcePlaceholder = useAdsensePlaceholderMode();
  const isVertical = format === "vertical";
  const [showUnfilledPlaceholder, setShowUnfilledPlaceholder] = useState(
    forcePlaceholder
  );

  function requestAdFill() {
    if (!parsed || pushed.current || forcePlaceholder) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // Ad blockers or script not loaded yet
    }
  }

  useEffect(() => {
    if (forcePlaceholder) return;
    requestAdFill();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-guarded single fill per mount
  }, [parsed, clientSlot, forcePlaceholder]);

  useEffect(() => {
    if (!parsed || forcePlaceholder) return;

    const timer = window.setTimeout(() => {
      if (!isInsFilled(insRef.current)) {
        setShowUnfilledPlaceholder(true);
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [parsed, clientSlot, forcePlaceholder]);

  if (!parsed) {
    return (
      <AdFrame label="ad" className={className}>
        <div
          className="min-h-[120px] px-4 py-5 text-center text-xs text-amber-900 dark:text-amber-100"
          role="status"
        >
          Invalid AdSense pairing. Use{" "}
          <span className="font-mono">ca-pub-XXXXXXXXXXXXXXXX:slotId</span> in
          admin.
        </div>
        <AdCardFooter brand="AdSense" showSeeMore={false} />
      </AdFrame>
    );
  }

  if (forcePlaceholder) {
    return (
      <AdFrame label="ad" className={className}>
        <AdSensePlaceholderBody
          placementLabel={placementLabel}
          clientSlot={clientSlot}
          message="Test frame (dev). Real ads show on your approved production domain."
          vertical={isVertical}
        />
      </AdFrame>
    );
  }

  const scriptId = `adsense-script-${parsed.clientId}`;
  const showPlaceholder = showUnfilledPlaceholder;

  return (
    <AdFrame label="ad" className={className}>
      <Script
        id={scriptId}
        strategy="afterInteractive"
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(parsed.clientId)}`}
        crossOrigin="anonymous"
      />

      {showPlaceholder ?
        <AdSensePlaceholderBody
          placementLabel={placementLabel}
          clientSlot={clientSlot}
          message="No ad fill yet. Check AdSense approval, domain, and ad-blockers."
          vertical={isVertical}
        />
      : null}

      {!showPlaceholder ?
        <ins
          ref={insRef}
          key={`${parsed.clientId}-${parsed.slotId}-${instanceId}`}
          className={`adsbygoogle block w-full overflow-hidden ${
            isVertical ? "min-h-[280px]" : "min-h-[120px]"
          }`}
          style={{ display: "block" }}
          data-ad-client={parsed.clientId}
          data-ad-slot={parsed.slotId}
          data-ad-format={format}
          data-full-width-responsive={format === "auto" ? "true" : undefined}
        />
      : null}
    </AdFrame>
  );
}
