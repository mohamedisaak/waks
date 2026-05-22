import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company onboarding",
  robots: { index: false, follow: false },
};

export default function CompanyOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
