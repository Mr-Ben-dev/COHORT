import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SmoothScroll } from "@/components/brand/smooth-scroll";

/**
 * COHORT — privacy-first clinical-trial eligibility + referral platform.
 * Typography: Outfit — the closest free geometric-grotesque substitute for
 * Impilo's Gilroy, weights 400/500/600 ONLY (Impilo ships no 700).
 */
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "COHORT — Prove you qualify. Keep your medical record.",
  description:
    "COHORT checks real clinical-trial eligibility with a private proof. Your health facts stay on your device — only the verified result is ever shared. Powered by Midnight.",
  keywords: [
    "clinical trials",
    "eligibility",
    "privacy",
    "private proof",
    "referral",
    "Midnight",
  ],
  openGraph: {
    title: "COHORT — Prove you qualify. Keep your medical record.",
    description:
      "Check clinical-trial eligibility with a privacy-preserving proof. Powered by Midnight.",
    siteName: "COHORT",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#3f3ccd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased`}>
        <SmoothScroll>{children}</SmoothScroll>
        <Toaster />
      </body>
    </html>
  );
}
