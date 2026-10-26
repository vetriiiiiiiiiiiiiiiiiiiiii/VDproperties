"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearSiteImage } from "@/app/admin/_actions/settings";
import { Media } from "@/components/site/Media";

export function SiteImageSlot({ field, label, url, alt, fallback }: { field: "heroImage" | "homesImage" | "enquiryImage" | "aboutImage"; label: string; url: string | null; alt: string | null; fallback: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="border border-line p-4">
      <p className="font-semibold">{label}</p>
      <div className="relative mt-3 aspect-[4/3] overflow-hidden bg-paper">
        <Media src={url ?? fallback} alt={alt ?? "Illustration in use until a photograph is uploaded"} sizes="300px" />
      </div>
      <p className="mt-2 text-xs text-slate">{url ? alt : "Using the sample illustration."}</p>
      <form
        className="mt-3 space-y-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("target", "site");
          fd.set("field", field);
          setBusy(true);
          const res = await fetch("/api/admin/uploads", { method: "POST", body: fd }).catch(() => null);
          const body = res ? await res.json().catch(() => ({})) : {};
          setBusy(false);
          setMsg(res?.ok && body.ok ? "Uploaded." : (body.message ?? "Upload failed"));
          if (res?.ok) router.refresh();
        }}
      >
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required aria-label={`${label} image file`} className="field py-1.5 text-xs" />
        <input name="alt" required minLength={3} placeholder="Describe the photograph" aria-label={`${label} description`} className="field min-h-9 py-1.5 text-sm" />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary min-h-9 py-1 text-xs" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
          {url && (
            <button type="button" disabled={pending} className="text-xs text-terracotta-deep underline" onClick={() => start(async () => { await clearSiteImage(field); router.refresh(); })}>
              Remove
            </button>
          )}
        </div>
        {msg && <p className="text-xs" role="status">{msg}</p>}
      </form>
    </div>
  );
}
