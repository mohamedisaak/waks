import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import SiteAnalyticsBeacon from "@/components/SiteAnalyticsBeacon";
import ThemeProvider from "@/components/ThemeProvider";
import ClerkProviderWithTheme from "@/components/ClerkProviderWithTheme";
import { DEFAULT_SITE_ORIGIN, getSiteOrigin } from "@/lib/siteUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteOrigin = getSiteOrigin();
const defaultDescription =
  "Find and apply to jobs across East Africa. Browse roles in Kenya, Uganda, Tanzania, and remote opportunities on Waks.";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin || DEFAULT_SITE_ORIGIN),
  title: {
    default: "Waks — Jobs in East Africa",
    template: "%s | Waks",
  },
  description: defaultDescription,
  applicationName: "Waks",
  keywords: [
    "Waks",
    "jobs in East Africa",
    "jobs in Kenya",
    "Nairobi jobs",
    "remote jobs Africa",
    "hire in East Africa",
  ],
  icons: {
    icon: "/waks-icon.svg",
    apple: "/waks-icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "Waks",
    title: "Waks — Jobs in East Africa",
    description: defaultDescription,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Waks — Jobs in East Africa",
    description: defaultDescription,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  ...(process.env.BING_SITE_VERIFICATION
    ? {
        other: {
          "msvalidate.01": process.env.BING_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ClerkProviderWithTheme>
            <ConvexClientProvider>
              <SiteAnalyticsBeacon />
              {children}
            </ConvexClientProvider>
          </ClerkProviderWithTheme>
        </ThemeProvider>
      </body>
    </html>
  );
}
