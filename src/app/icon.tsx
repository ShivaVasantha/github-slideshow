import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// App icon / favicon: brand-blue tile with an "HLF" wordmark.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1f57e0, #1c3672)",
          color: "white",
          fontSize: 180,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        HLF
      </div>
    ),
    { ...size },
  );
}
