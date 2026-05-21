export default function PricingCardsSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-6 pb-24">
      <div className="mx-auto mb-8 h-4 w-64 rounded bg-surface-muted" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-80 rounded-2xl border border-border-strong bg-surface-muted"
          />
        ))}
      </div>
    </div>
  );
}
