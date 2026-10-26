"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapPin = { lat: number; lng: number; label: string; href?: string; status?: string };

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SAT_URL = process.env.NEXT_PUBLIC_SATELLITE_TILE_URL || "";
const SAT_ATTRIBUTION = process.env.NEXT_PUBLIC_SATELLITE_ATTRIBUTION || "";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Leaflet map with an optional satellite layer, boundary polygon and pins. Rendered client-side only. */
export default function LeafletMap({
  pins = [],
  boundary,
  boundaryStyle = "solid",
  height = 420,
  label,
}: {
  pins?: MapPin[];
  boundary?: [number, number][];
  boundaryStyle?: "solid" | "dashed";
  height?: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true });
    const streets = L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    if (SAT_URL) L.control.layers({ Map: streets, Satellite: L.tileLayer(SAT_URL, { attribution: SAT_ATTRIBUTION, maxZoom: 19 }) }).addTo(map);

    const bounds: L.LatLngExpression[] = [];
    if (boundary && boundary.length >= 3) {
      L.polygon(boundary, { color: "#D4921C", weight: 3, fillColor: "#8CBF26", fillOpacity: 0.25, dashArray: boundaryStyle === "dashed" ? "8 6" : undefined }).addTo(map);
      bounds.push(...boundary);
    }
    for (const p of pins) {
      const marker = L.circleMarker([p.lat, p.lng], { radius: 9, color: "#FDFAF3", weight: 2, fillColor: p.status === "SOLD" ? "#B90E10" : p.status === "RESERVED" ? "#D4921C" : "#2C7A1E", fillOpacity: 1 }).addTo(map);
      const html = p.href ? `<a href="${encodeURI(p.href)}" style="font-weight:600">${escapeHtml(p.label)}</a>` : escapeHtml(p.label);
      marker.bindPopup(html);
      marker.bindTooltip(escapeHtml(p.label));
      bounds.push([p.lat, p.lng]);
    }
    if (bounds.length === 1) map.setView(bounds[0], 17);
    else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 18 });
    else map.setView([20.6, 78.9], 4);
    return () => {
      map.remove();
    };
  }, [pins, boundary, boundaryStyle]);

  return <div ref={ref} role="region" aria-label={label} style={{ height }} className="z-0 w-full border border-line bg-paper" />;
}
