import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import SiteAnalyticsBeacon from "@/components/SiteAnalyticsBeacon";
import ThemeProvider from "@/components/ThemeProvider";
import ClerkProviderWithTheme from "@/components/ClerkProviderWithTheme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waks — Find Your Next Role",
  description: "Browse thousands of jobs and apply in minutes.",
  icons: {
    icon: "/waks-icon.svg",
  },
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
