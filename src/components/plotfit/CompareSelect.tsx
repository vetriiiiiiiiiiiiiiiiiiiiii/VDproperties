"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/** Collects "Compare" checkboxes from its children and opens the comparison page. */
export function CompareSelect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div
      ref={ref}
      onChange={() => setPicked([...(ref.current?.querySelectorAll<HTMLInputElement>('input[name="compare"]:checked') ?? [])].map((i) => i.value))}
    >
      {children}
      {picked.length > 0 && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-3 border border-forest bg-forest p-3 text-ivory shadow-lg">
          <span className="text-sm">{picked.length} selected {picked.length > 4 && "— compare up to 4"}</span>
          <button type="button" disabled={picked.length < 2 || picked.length > 4} className="btn btn-gold min-h-10" onClick={() => router.push(`/compare?p=${picked.join(",")}`)}>
            Compare {picked.length >= 2 ? picked.length : ""}
          </button>
        </div>
      )}
    </div>
  );
}
