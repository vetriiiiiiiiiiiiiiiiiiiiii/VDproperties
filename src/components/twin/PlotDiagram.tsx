import { northArrowAngle } from "@/lib/studio/layout";

/** Plot outline drawn to scale from recorded dimensions. Road at the bottom. */
export function PlotDiagram({ widthFt, depthFt, frontBearing, road }: { widthFt: number; depthFt: number; frontBearing: number | null; road?: string | null }) {
  const max = 300;
  const s = max / Math.max(widthFt, depthFt);
  const w = widthFt * s;
  const h = depthFt * s;
  const ox = 60 + (max - w) / 2;
  const oy = 40 + (max - h) / 2;
  return (
    <svg viewBox="0 0 420 420" className="w-full max-w-md" role="img" aria-label={`Plot outline ${widthFt} feet by ${depthFt} feet, drawn to scale from recorded dimensions`}>
      <defs>
        <pattern id="pd-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#0A3468" strokeOpacity="0.08" />
        </pattern>
      </defs>
      <rect width="420" height="420" fill="url(#pd-grid)" />
      <rect x={ox} y={oy} width={w} height={h} fill="#8CBF26" fillOpacity="0.22" stroke="#2C7A1E" strokeWidth="2.5" />
      <g stroke="#D4921C" fill="none">
        <path d={`M${ox} ${oy - 14}H${ox + w}M${ox} ${oy - 20}V${oy - 8}M${ox + w} ${oy - 20}V${oy - 8}`} />
        <path d={`M${ox + w + 14} ${oy}V${oy + h}M${ox + w + 8} ${oy}H${ox + w + 20}M${ox + w + 8} ${oy + h}H${ox + w + 20}`} />
      </g>
      <g fontFamily="var(--font-plex-mono), monospace" fontSize="12" fill="#0A3468" letterSpacing="1">
        <text x={ox + w / 2} y={oy - 24} textAnchor="middle">{widthFt} ft</text>
        <text x={ox + w + 30} y={oy + h / 2} transform={`rotate(90 ${ox + w + 30} ${oy + h / 2})`} textAnchor="middle">{depthFt} ft</text>
        <text x={ox + w / 2} y={oy + h / 2 + 4} textAnchor="middle" fontSize="13">{Math.round(widthFt * depthFt).toLocaleString("en-IN")} sq ft</text>
      </g>
      <rect x="20" y={oy + h + 14} width="380" height="26" fill="#0A3468" fillOpacity="0.08" />
      <path d={`M24 ${oy + h + 27}H396`} stroke="#D4921C" strokeDasharray="12 8" />
      <text x="210" y={oy + h + 56} textAnchor="middle" fontFamily="var(--font-plex-mono), monospace" fontSize="11" fill="#565F69" letterSpacing="2">
        {(road ?? "ACCESS ROAD").toUpperCase().slice(0, 40)}
      </text>
      {frontBearing !== null && (
        <g transform={`translate(380 50) rotate(${northArrowAngle(frontBearing)})`}>
          <circle r="18" fill="#FDFAF3" stroke="#0A3468" />
          <path d="M0 -14 L6 8 L0 4 L-6 8Z" fill="#0A3468" />
          <text y="-22" textAnchor="middle" fontSize="11" fill="#0A3468" transform={`rotate(${-northArrowAngle(frontBearing)} 0 -22)`}>N</text>
        </g>
      )}
    </svg>
  );
}
