import Link from "next/link";

export function AuthBranding() {
  return (
    <Link
      href="/"
      className="mb-8 inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
    >
      <div className="flex gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D] opacity-50" />
      </div>
      <span className="text-lg font-bold tracking-tight">Waks</span>
    </Link>
  );
}
