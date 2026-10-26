"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/client";

/** Collects "Compare" checkboxes from its children and opens the comparison page. */
export function CompareSelect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t, href } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div
      ref={ref}
      onChange={() => setPicked([...(ref.current?.querySelectorAll<HTMLInputElement>('input[name="compare"]:checked') ?? [])].map((i) => i.value))}
    >
      {children}
      {picked.length > 0 && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-3 glass-dark rounded-full p-2 pl-5 text-ivory shadow-lg">
          <span className="text-sm">{t.plotfit.results.selected(picked.length)}</span>
          <button type="button" disabled={picked.length < 2 || picked.length > 4} className="btn btn-gold min-h-10" onClick={() => router.push(href(`/compare?p=${picked.join(",")}`))}>
            {t.plotfit.results.compareN(picked.length)}
          </button>
        </div>
      )}
    </div>
  );
}
