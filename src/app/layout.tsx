import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "HLF Finance",
  title: {
    default: "HLF Finance — Loan Management",
    template: "%s · HLF Finance",
  },
  description:
    "Cloud loan-management platform for a vehicle financing business operating an HLF franchise co-lending model in Hosur, Tamil Nadu.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HLF Finance",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1f57e0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
