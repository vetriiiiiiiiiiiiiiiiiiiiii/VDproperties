"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="flex h-[420px] w-full items-center justify-center border border-line bg-paper text-sm text-slate">Loading map…</div>,
});

export function MapView(props: { pins?: MapPin[]; boundary?: [number, number][]; boundaryStyle?: "solid" | "dashed"; height?: number; label: string }) {
  return <LeafletMap {...props} />;
}
export type { MapPin };
