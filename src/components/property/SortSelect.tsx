"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SORT_OPTIONS } from "@/lib/search";

export function SortSelect({ value }: { value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="annot-plain text-slate">Sort</label>
      <select
        id="sort"
        className="field min-h-10 w-auto py-1.5 text-sm"
        aria-busy={pending}
        value={value ?? "newest"}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "newest") next.delete("sort");
          else next.set("sort", e.target.value);
          next.delete("page");
          const qs = next.toString();
          startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
        }}
      >
        {Object.entries(SORT_OPTIONS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate" role="status">Updating…</span>}
    </div>
  );
}
