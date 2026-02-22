import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import ThemeProvider from "@/components/ThemeProvider";
import AppNav from "@/components/AppNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Home Research — Affordability Calculator & Market Analysis",
    template: "%s | AI Home Research",
  },
  description:
    "Free AI-powered home affordability calculator. Get personalized analysis using real-time mortgage rates, market data, and risk assessment from 4 AI agents.",
  keywords: [
    "home affordability calculator",
    "mortgage calculator",
    "how much house can I afford",
    "home buying analysis",
    "AI mortgage advisor",
    "real-time mortgage rates",
    "rent vs buy calculator",
  ],
  authors: [{ name: "AI Home Research" }],
  creator: "AI Home Research",
  metadataBase: new URL("https://aicalculator.homes"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aicalculator.homes",
    siteName: "AI Home Research",
    title: "AI Home Research — Affordability Calculator & Market Analysis",
    description:
      "Free AI-powered home affordability calculator. Personalized analysis with real-time mortgage rates, market data, and risk assessment.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI Home Research — Affordability Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Home Research — Affordability Calculator",
    description:
      "Free AI-powered home affordability calculator with real-time mortgage rates and market analysis.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://aicalculator.homes",
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <ThemeProvider>
            <AppNav />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
