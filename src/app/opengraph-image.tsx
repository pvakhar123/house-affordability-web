import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HomeIQ — Affordability Calculator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
            }}
          >
            🏠
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            HomeIQ
          </span>
        </div>
        <div
          style={{
            fontSize: "26px",
            opacity: 0.9,
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Free AI-powered affordability calculator with real-time mortgage rates, market analysis & risk assessment
        </div>
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "40px",
            fontSize: "18px",
            opacity: 0.7,
          }}
        >
          <span>4 AI Agents</span>
          <span>·</span>
          <span>Live Market Data</span>
          <span>·</span>
          <span>Personalized Analysis</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
