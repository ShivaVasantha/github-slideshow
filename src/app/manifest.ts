import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HLF Finance — Loan Management",
    short_name: "HLF Finance",
    description:
      "Vehicle loan management for an HLF franchise co-lending business in Hosur, Tamil Nadu.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1c3672",
    theme_color: "#1f57e0",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
