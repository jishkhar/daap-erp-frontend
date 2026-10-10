import type { Metadata } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// Plus Jakarta Sans: a warm, slightly rounded geometric sans for display/
// headings -- distinct from the Inter/Geist "safe default" look, still reads
// as clean and modern rather than quirky. IBM Plex Sans for body/UI text:
// excellent legibility at small sizes (dashboards, tables, form labels), a
// bit more technical/precise than Jakarta, which is exactly the contrast a
// display/body pairing wants.
// Self-hosted (src/app/fonts) so the build never depends on fetching Google Fonts -- a failed
// fetch there broke the Vercel build. Same families and weights as before.
const displayFont = localFont({
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
});

const bodyFont = localFont({
  src: [
    {
      path: "./fonts/ibm-plex-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ibm-plex-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "ERP — Orders, inventory and customers across every branch and channel",
  description:
    "One ERP for every branch and every sales channel — Online, POS and WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
