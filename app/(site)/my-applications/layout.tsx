import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My applications",
  robots: { index: false, follow: false },
};

export default function MyApplicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
