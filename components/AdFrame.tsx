import type { ReactNode } from "react";

export type AdLabel = "ad" | "sponsored";

type AdFrameProps = {
  /** Short label shown centered above the unit. */
  label: AdLabel;
  children: ReactNode;
  className?: string;
};

const LABEL_DISPLAY: Record<AdLabel, string> = {
  ad: "Advert",
  sponsored: "Sponsored",
};

const ARIA_LABEL: Record<AdLabel, string> = {
  ad: "Advertisement",
  sponsored: "Sponsored",
};

export function AdFrame({ label, children, className = "" }: AdFrameProps) {
  return (
    <aside aria-label={ARIA_LABEL[label]} className={className}>
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {LABEL_DISPLAY[label]}
      </p>
      <div className="mt-1 overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {children}
      </div>
    </aside>
  );
}

/** Footer row with brand + optional "See more" CTA (place inside the clickable card). */
export function AdCardFooter({
  brand,
  showSeeMore = true,
}: {
  brand?: string;
  showSeeMore?: boolean;
}) {
  if (!brand && !showSeeMore) return null;

  return (
    <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
      <span className="truncate text-xs font-medium text-muted">
        {brand ?? ""}
      </span>
      {showSeeMore ?
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-blue-600">
          See more
          <span aria-hidden="true">&rsaquo;</span>
        </span>
      : null}
    </footer>
  );
}
