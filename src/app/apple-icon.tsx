import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon (Safari applies its own rounded mask, so fill fully).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1f57e0, #1c3672)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>HLF</div>
        <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.85, marginTop: 6 }}>
          Finance
        </div>
      </div>
    ),
    { ...size },
  );
}
