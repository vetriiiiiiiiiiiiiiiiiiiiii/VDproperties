"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/client";
import type { MapPin } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const { t } = useI18n();
  return <div className="flex h-[420px] w-full animate-pulse items-center justify-center rounded-[1rem] bg-paper text-sm text-slate">{t.twin.mapLoading}</div>;
}

export function MapView(props: { pins?: MapPin[]; boundary?: [number, number][]; boundaryStyle?: "solid" | "dashed"; height?: number; label: string }) {
  return <LeafletMap {...props} />;
}
export type { MapPin };
