import type { ReactNode } from "react";

type MarketingCtaBandProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export default function MarketingCtaBand({
  title,
  description,
  children,
}: MarketingCtaBandProps) {
  return (
    <section className="border-t border-[#4CAF7D]/20 bg-[#4CAF7D]/10 px-6 py-20 text-center dark:border-[#4CAF7D]/30 dark:bg-[#4CAF7D]/15">
      <h2 className="mb-3 text-3xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mb-8 max-w-md text-sm text-muted">{description}</p>
      {children}
    </section>
  );
}
