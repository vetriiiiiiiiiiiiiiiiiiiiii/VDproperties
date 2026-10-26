"use client";

import type { PlotGeometry, Rect, RoomKind, StudioInputs, StudioResult } from "@/lib/studio/layout";
import { northArrowAngle } from "@/lib/studio/layout";

const ROOM_FILL: Record<RoomKind, string> = {
  public: "#F3C86A",
  service: "#FDB668",
  private: "#8CBF26",
  circulation: "#E3DCCB",
  flex: "#9CC3E6",
};

function useFit(plot: PlotGeometry, box = 520, pad = 56) {
  const s = (box - pad * 2) / Math.max(plot.widthFt, plot.depthFt);
  const ox = pad + (box - pad * 2 - plot.widthFt * s) / 2;
  const oy = pad + (box - pad * 2 - plot.depthFt * s) / 2;
  // y in plan coordinates runs from the road (front) upward on screen, so flip vertically.
  const X = (x: number) => ox + x * s;
  const Y = (y: number) => oy + (plot.depthFt - y) * s;
  const R = (r: Rect) => ({ x: X(r.x), y: Y(r.y + r.h), width: r.w * s, height: r.h * s });
  return { s, X, Y, R, box };
}

const mono = "var(--font-plex-mono), ui-monospace, monospace";

export function SitePlan({ plot, result, inputs }: { plot: PlotGeometry; result: StudioResult; inputs: StudioInputs }) {
  const { X, Y, R, box } = useFit(plot);
  const fp = R(result.footprint);
  const env = R(result.envelope);
  return (
    <svg viewBox={`0 0 ${box} ${box + 30}`} className="h-auto w-full" role="img" aria-label={`Conceptual site plan: ${Math.round(result.footprint.w)} by ${Math.round(result.footprint.h)} foot footprint on a ${plot.widthFt} by ${plot.depthFt} foot plot`}>
      <defs>
        <pattern id="sp-garden" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="10" height="10" fill="#8CBF26" fillOpacity="0.28" />
          <path d="M0 0V10" stroke="#2C7A1E" strokeOpacity="0.35" />
        </pattern>
        <pattern id="sp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#0A3468" strokeOpacity="0.06" />
        </pattern>
      </defs>
      <rect width={box} height={box + 30} fill="url(#sp-grid)" />
      {/* Road */}
      <rect x="0" y={Y(0) + 8} width={box} height="26" fill="#0A3468" fillOpacity="0.1" />
      <path d={`M0 ${Y(0) + 21}H${box}`} stroke="#D4921C" strokeDasharray="12 8" />
      <text x={box / 2} y={Y(0) + 50} textAnchor="middle" fontFamily={mono} fontSize="10" letterSpacing="2" fill="#565F69">ROAD / ACCESS</text>
      {/* Plot */}
      <rect x={X(0)} y={Y(plot.depthFt)} width={plot.widthFt * (X(1) - X(0))} height={plot.depthFt * (X(1) - X(0))} fill="#FDFAF3" stroke="#0A3468" strokeWidth="2" />
      {/* Buildable envelope */}
      <rect {...env} fill="none" stroke="#D4921C" strokeDasharray="6 5" strokeWidth="1.5" />
      {result.garden && <rect {...R(result.garden)} fill="url(#sp-garden)" />}
      {result.garden && <text x={X(result.garden.x + result.garden.w / 2)} y={Y(result.garden.y + result.garden.h / 2) + 4} textAnchor="middle" fontFamily={mono} fontSize="10" fill="#0C3F19">GARDEN</text>}
      {/* Footprint */}
      {result.footprintSqft > 0 && (
        <g style={{ transition: "all .4s" }}>
          <rect {...fp} fill={inputs.style === "TRADITIONAL" ? "#E5401A" : "#0A3468"} fillOpacity="0.85" />
          {result.courtyard && <rect {...R(result.courtyard)} fill="url(#sp-garden)" stroke="#FDFAF3" />}
          <text x={fp.x + fp.width / 2} y={fp.y + fp.height / 2 - 4} textAnchor="middle" fill="#FDFAF3" fontFamily={mono} fontSize="11">HOUSE · {inputs.floors} FLOOR{inputs.floors > 1 ? "S" : ""}</text>
          <text x={fp.x + fp.width / 2} y={fp.y + fp.height / 2 + 12} textAnchor="middle" fill="#FDFAF3" fontFamily={mono} fontSize="10">{Math.round(result.footprint.w)}′ × {Math.round(result.footprint.h)}′</text>
        </g>
      )}
      {result.parking.map((p, i) => (
        <g key={i}>
          <rect {...R(p)} fill="#FDFAF3" stroke="#121C27" strokeDasharray="3 3" />
          <text x={X(p.x + p.w / 2)} y={Y(p.y + p.h / 2) + 4} textAnchor="middle" fontFamily={mono} fontSize="9" fill="#121C27">P</text>
        </g>
      ))}
      {/* Dimensions */}
      <g stroke="#D4921C" fill="none">
        <path d={`M${X(0)} ${Y(plot.depthFt) - 16}H${X(plot.widthFt)}`} />
        <path d={`M${X(plot.widthFt) + 16} ${Y(plot.depthFt)}V${Y(0)}`} />
      </g>
      <g fontFamily={mono} fontSize="11" fill="#0A3468">
        <text x={(X(0) + X(plot.widthFt)) / 2} y={Y(plot.depthFt) - 22} textAnchor="middle">{plot.widthFt} ft</text>
        <text x={X(plot.widthFt) + 30} y={(Y(0) + Y(plot.depthFt)) / 2} textAnchor="middle" transform={`rotate(90 ${X(plot.widthFt) + 30} ${(Y(0) + Y(plot.depthFt)) / 2})`}>{plot.depthFt} ft</text>
        <text x={X(0) + 4} y={Y(0) - 4} fontSize="9" fill="#9A6410">front {plot.setbacks.front}′</text>
        <text x={X(0) + 4} y={Y(plot.depthFt) + 12} fontSize="9" fill="#9A6410">rear {plot.setbacks.rear}′</text>
      </g>
      {plot.frontBearing !== null && (
        <g transform={`translate(${box - 30} 30) rotate(${northArrowAngle(plot.frontBearing)})`}>
          <circle r="16" fill="#FDFAF3" stroke="#0A3468" />
          <path d="M0 -12 L5 7 L0 3 L-5 7Z" fill="#0A3468" />
        </g>
      )}
    </svg>
  );
}

export function FloorPlan({ plot, result, level }: { plot: PlotGeometry; result: StudioResult; level: number }) {
  const floor = result.floors[level];
  if (!floor) return null;
  const f = result.footprint;
  const pad = 30;
  const box = 520;
  const s = (box - pad * 2) / Math.max(f.w, f.h);
  const ox = pad + (box - pad * 2 - f.w * s) / 2;
  const oy = pad + (box - pad * 2 - f.h * s) / 2;
  const R = (r: Rect) => ({ x: ox + (r.x - f.x) * s, y: oy + (f.h - (r.y - f.y) - r.h) * s, width: r.w * s, height: r.h * s });
  return (
    <svg viewBox={`0 0 ${box} ${box}`} className="h-auto w-full" role="img" aria-label={`${floor.label} zoning: ${floor.rooms.map((r) => r.name).join(", ")}`}>
      <rect x={ox} y={oy} width={f.w * s} height={f.h * s} fill="#FDFAF3" stroke="#0A3468" strokeWidth="5" />
      {floor.rooms.map((room) => {
        const r = R(room);
        const big = r.width > 60 && r.height > 34;
        return (
          <g key={room.name}>
            <rect {...r} fill={ROOM_FILL[room.kind]} fillOpacity="0.55" stroke="#0A3468" strokeWidth="1.5" />
            <text x={r.x + r.width / 2} y={r.y + r.height / 2 - (big ? 3 : 0)} textAnchor="middle" fontFamily={mono} fontSize={big ? 11 : 8} fill="#121C27">{room.name.toUpperCase()}</text>
            {big && <text x={r.x + r.width / 2} y={r.y + r.height / 2 + 12} textAnchor="middle" fontFamily={mono} fontSize="9" fill="#565F69">{room.areaSqft} sq ft</text>}
          </g>
        );
      })}
      {level === 0 && result.parkingInEnvelope && result.parking.map((p, i) => {
        const r = R(p);
        return (
          <g key={i}>
            <rect {...r} fill="#FDFAF3" stroke="#121C27" strokeDasharray="4 3" />
            <text x={r.x + r.width / 2} y={r.y + r.height / 2} textAnchor="middle" fontFamily={mono} fontSize="9">PARKING</text>
          </g>
        );
      })}
      {result.courtyard && <rect {...R(result.courtyard)} fill="#8CBF26" fillOpacity="0.35" stroke="#2C7A1E" />}
      <text x={box / 2} y={box - 6} textAnchor="middle" fontFamily={mono} fontSize="10" letterSpacing="2" fill="#565F69">ROAD SIDE ↓ · {plot.widthFt}′ FRONTAGE</text>
    </svg>
  );
}

/** Axonometric massing drawn from the actual footprint, floors and style. */
export function Massing({ plot, result, inputs }: { plot: PlotGeometry; result: StudioResult; inputs: StudioInputs }) {
  const box = 560;
  const floorH = 10.5;
  const cos = Math.cos(Math.PI / 6);
  const sin = Math.sin(Math.PI / 6);
  const extent = (plot.widthFt + plot.depthFt) * cos;
  const height = (plot.widthFt + plot.depthFt) * sin + floorH * (inputs.floors + 1.5);
  const s = Math.min((box - 60) / extent, (box - 80) / height);
  const cx = box / 2 + ((plot.depthFt - plot.widthFt) * cos * s) / 2;
  const cy = 40 + floorH * (inputs.floors + 1.5) * s;
  // Road side (y = 0) is nearest the viewer, so project the distance from the rear boundary.
  const P = (x: number, y: number, z = 0) => {
    const yy = plot.depthFt - y;
    return [cx + (x - yy) * cos * s, cy + (x + yy) * sin * s - z * s] as const;
  };
  const poly = (pts: (readonly [number, number])[]) => pts.map((p) => p.join(",")).join(" ");
  // Isometric "y" runs away from the viewer = from the road towards the rear.
  const quad = (r: Rect, z: number) => poly([P(r.x, r.y, z), P(r.x + r.w, r.y, z), P(r.x + r.w, r.y + r.h, z), P(r.x, r.y + r.h, z)]);
  const f = result.footprint;
  const top = inputs.floors * floorH;

  return (
    <svg viewBox={`0 0 ${box} ${box}`} className="h-auto w-full" role="img" aria-label={`Massing view: ${inputs.floors}-storey ${inputs.style.toLowerCase()} house on the plot`}>
      <defs>
        <linearGradient id="ms-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDB668" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FDFAF3" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={box} height={box} fill="url(#ms-sky)" />
      <polygon points={quad({ x: 0, y: 0, w: plot.widthFt, h: plot.depthFt }, 0)} fill="#8CBF26" fillOpacity="0.3" stroke="#2C7A1E" strokeWidth="1.5" />
      <polygon points={quad(result.envelope, 0)} fill="none" stroke="#D4921C" strokeDasharray="5 4" />
      {result.garden && <polygon points={quad(result.garden, 0)} fill="#2C7A1E" fillOpacity="0.35" />}
      {!result.parkingInEnvelope && result.parking.map((p, i) => <polygon key={i} points={quad(p, 0)} fill="#FDFAF3" stroke="#565F69" strokeDasharray="3 2" />)}
      {result.footprintSqft > 0 &&
        Array.from({ length: inputs.floors }).map((_, lvl) => {
          const z0 = lvl * floorH;
          const z1 = z0 + floorH;
          // Visible faces: the road-facing front (y = f.y) and the right side (x = f.x + f.w).
          const front = poly([P(f.x, f.y, z0), P(f.x + f.w, f.y, z0), P(f.x + f.w, f.y, z1), P(f.x, f.y, z1)]);
          const right = poly([P(f.x + f.w, f.y, z0), P(f.x + f.w, f.y + f.h, z0), P(f.x + f.w, f.y + f.h, z1), P(f.x + f.w, f.y, z1)]);
          return (
            <g key={lvl}>
              <polygon points={right} fill="#0A3468" stroke="#FDFAF3" strokeWidth="1" />
              <polygon points={front} fill="#D4921C" stroke="#FDFAF3" strokeWidth="1" />
              {/* Window rhythm on the front face */}
              {Array.from({ length: Math.max(1, Math.floor(f.w / 9)) }).map((__, k) => {
                const wx = f.x + 3 + k * 9;
                if (wx + 4 > f.x + f.w) return null;
                return <polygon key={k} points={poly([P(wx, f.y, z0 + 3.5), P(wx + 4, f.y, z0 + 3.5), P(wx + 4, f.y, z0 + 7.5), P(wx, f.y, z0 + 7.5)])} fill="#FDFAF3" fillOpacity="0.75" />;
              })}
            </g>
          );
        })}
      {result.footprintSqft > 0 &&
        (inputs.style === "TRADITIONAL" ? (
          <>
            {/* Pitched roof: ridge runs front-to-back */}
            <polygon points={poly([P(f.x, f.y, top), P(f.x + f.w / 2, f.y, top + f.w * 0.28), P(f.x + f.w, f.y, top)])} fill="#B90E10" stroke="#FDFAF3" />
            <polygon points={poly([P(f.x + f.w / 2, f.y, top + f.w * 0.28), P(f.x + f.w / 2, f.y + f.h, top + f.w * 0.28), P(f.x + f.w, f.y + f.h, top), P(f.x + f.w, f.y, top)])} fill="#E5401A" stroke="#FDFAF3" />
          </>
        ) : (
          <>
            <polygon points={quad(f, top)} fill="#F3C86A" stroke="#FDFAF3" />
            {result.courtyard && <polygon points={quad(result.courtyard, top)} fill="#2C7A1E" fillOpacity="0.6" />}
          </>
        ))}
      {result.parkingInEnvelope && result.parking.map((p, i) => <polygon key={`pk${i}`} points={poly([P(p.x, p.y, 0.1), P(p.x + p.w, p.y, 0.1), P(p.x + p.w, p.y, floorH - 0.5), P(p.x, p.y, floorH - 0.5)])} fill="#121C27" fillOpacity="0.55" />)}
      <text x={box / 2} y={box - 10} textAnchor="middle" fontFamily={mono} fontSize="10" letterSpacing="2" fill="#565F69">CONCEPT MASSING · NOT TO SCALE FOR CONSTRUCTION</text>
    </svg>
  );
}
