import { ImageResponse } from "next/og";

export const alt = "V D Properties — Build better from now";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#103D30", color: "#F7F5EF", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", right: 80, top: 80, width: 180, height: 180, borderRadius: 999, background: "#D84B36" }} />
        <div style={{ position: "absolute", left: 72, right: 72, bottom: 150, height: 2, background: "#C99A32" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#C99A32" }}>LAND · HOMES · POSSIBILITIES</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 96, lineHeight: 1 }}>V D Properties</div>
            <div style={{ fontSize: 34, marginTop: 70, letterSpacing: 4 }}>BUILD BETTER FROM NOW</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
