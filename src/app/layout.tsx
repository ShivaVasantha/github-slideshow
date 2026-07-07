import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HLF Finance — Loan Management",
  description:
    "Cloud loan-management platform for a vehicle financing business operating an HLF franchise co-lending model in Hosur, Tamil Nadu.",
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
