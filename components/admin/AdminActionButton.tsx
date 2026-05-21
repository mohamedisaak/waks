"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "danger" | "success" | "neutral" | "secondary";

const variantClass: Record<Variant, string> = {
  danger:
    "border-danger-border bg-danger-bg text-danger-text hover:opacity-90",
  success:
    "border-success-border bg-success-bg text-success-text hover:opacity-90",
  neutral:
    "border-border-strong bg-surface-muted text-foreground hover:bg-canvas",
  secondary:
    "border-border-strong bg-surface text-muted hover:bg-surface-muted hover:text-foreground",
};

const baseClass =
  "inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium leading-snug transition-colors disabled:cursor-not-allowed disabled:opacity-50";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function AdminActionButton({
  variant = "neutral",
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

export function AdminActionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  );
}

export function AdminLoadMoreButton({
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <AdminActionButton
      variant="neutral"
      className={`rounded-full px-5 py-2 text-sm ${className}`.trim()}
      {...rest}
    >
      {children}
    </AdminActionButton>
  );
}
