"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { removeDocument, toggleDocumentVisibility } from "@/app/admin/_actions/properties";
import { Status } from "./kit";

type Doc = { id: string; title: string; isPublic: boolean };

export function DocumentManager({ propertyId, documents }: { propertyId: string; documents: Doc[] }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<unknown>) => start(async () => {
    await fn();
    router.refresh();
  });

  return (
    <div className="space-y-5">
      {documents.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <a href={`/documents/${d.id}`} target="_blank" rel="noopener" className="font-medium text-navy underline">{d.title}</a>
              <div className="flex items-center gap-2 text-sm">
                <span className={`annot-plain px-2 py-1 ${d.isPublic ? "bg-emerald text-ivory" : "bg-paper text-slate"}`}>{d.isPublic ? "Public" : "Staff only"}</span>
                <button type="button" disabled={pending} className="border border-line px-3 py-1.5" onClick={() => act(() => toggleDocumentVisibility(d.id))}>
                  {d.isPublic ? "Make private" : "Make public"}
                </button>
                <button type="button" disabled={pending} className="border border-terracotta/40 px-3 py-1.5 text-terracotta-deep" onClick={() => window.confirm("Delete this document?") && act(() => removeDocument(d.id))}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        ref={ref}
        className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("propertyId", propertyId);
          setBusy(true);
          const res = await fetch("/api/admin/documents", { method: "POST", body: fd }).catch(() => null);
          const body = res ? await res.json().catch(() => ({})) : {};
          setBusy(false);
          if (res?.ok && body.ok) {
            setMsg({ ok: true, message: "Document uploaded as staff-only. Make it public only if it may be shared." });
            ref.current?.reset();
            router.refresh();
          } else setMsg({ ok: false, message: body.message ?? "Upload failed" });
        }}
      >
        <div>
          <label htmlFor="doc-title" className="field-label">Document title</label>
          <input id="doc-title" name="title" required className="field" placeholder="e.g. Approved layout plan" />
        </div>
        <div>
          <label htmlFor="doc-file" className="field-label">PDF file</label>
          <input id="doc-file" name="file" type="file" accept="application/pdf" required className="field py-2 text-sm" />
        </div>
        <button type="submit" disabled={busy} className="btn btn-primary min-h-11 text-sm">{busy ? "Uploading…" : "Upload PDF"}</button>
      </form>
      {msg && <Status state={msg} />}
    </div>
  );
}
