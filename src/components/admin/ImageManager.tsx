"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { moveImage, removeImage, updateImage } from "@/app/admin/_actions/properties";
import { moveProjectImage, removeProjectImage, updateProjectImageAlt } from "@/app/admin/_actions/projects";
import { Media } from "@/components/site/Media";
import { Status, Submit } from "./kit";

type Img = { id: string; url: string; alt: string; kind?: "PHOTO" | "FLOOR_PLAN" | "SITE_PLAN" };

export function ImageManager({ target, ownerId, images }: { target: "property" | "project"; ownerId: string; images: Img[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("target", target);
    fd.set("id", ownerId);
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) setMessage({ ok: false, text: body.message ?? "Upload failed" });
      else {
        setMessage({ ok: true, text: "Image uploaded." });
        formRef.current?.reset();
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Upload failed — check your connection." });
    } finally {
      setBusy(false);
    }
  }

  const act = (fn: () => Promise<unknown>) => startTransition(async () => {
    await fn();
    router.refresh();
  });

  return (
    <div className="space-y-6">
      {images.length === 0 ? (
        <p className="border border-dashed border-line p-6 text-center text-sm text-slate">No images yet. Upload photographs you have permission to publish.</p>
      ) : (
        <ol className="space-y-3" aria-busy={pending}>
          {images.map((img, i) => (
            <li key={img.id} className="grid gap-4 border border-line p-3 sm:grid-cols-[9rem_1fr_auto] sm:items-start">
              <div className="relative aspect-[4/3] overflow-hidden bg-paper">
                <Media src={img.url} alt={img.alt} sizes="144px" />
                {i === 0 && <span className="annot-plain absolute left-1 top-1 bg-forest px-1.5 py-0.5 text-[0.6rem] text-ivory">Cover</span>}
              </div>
              <AltForm target={target} img={img} />
              <div className="flex gap-1 sm:flex-col">
                <button type="button" className="h-9 border border-line px-3 text-sm disabled:opacity-40" disabled={i === 0 || pending} onClick={() => act(() => (target === "property" ? moveImage(img.id, -1) : moveProjectImage(img.id, -1)))} aria-label={`Move image ${i + 1} up`}>↑</button>
                <button type="button" className="h-9 border border-line px-3 text-sm disabled:opacity-40" disabled={i === images.length - 1 || pending} onClick={() => act(() => (target === "property" ? moveImage(img.id, 1) : moveProjectImage(img.id, 1)))} aria-label={`Move image ${i + 1} down`}>↓</button>
                <button
                  type="button"
                  className="h-9 border border-terracotta/40 px-3 text-sm text-terracotta-deep"
                  disabled={pending}
                  onClick={() => window.confirm("Remove this image? The file will be deleted.") && act(() => (target === "property" ? removeImage(img.id) : removeProjectImage(img.id)))}
                  aria-label={`Remove image ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <form ref={formRef} onSubmit={upload} className="grid gap-4 border-t border-line pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor={`file-${target}`} className="field-label">Image file</label>
          <input id={`file-${target}`} name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="field py-2 text-sm" />
          <p className="field-hint">JPEG, PNG, WebP or AVIF, up to 12 MB. Location metadata is removed automatically.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor={`alt-${target}`} className="field-label">Description (alt text)</label>
            <input id={`alt-${target}`} name="alt" required minLength={3} maxLength={200} className="field" placeholder="e.g. Front view of the house from the road" />
          </div>
          {target === "property" && (
            <div>
              <label htmlFor="kind-new" className="field-label">Type</label>
              <select id="kind-new" name="kind" className="field">
                <option value="PHOTO">Photo</option>
                <option value="FLOOR_PLAN">Floor plan</option>
                <option value="SITE_PLAN">Site plan</option>
              </select>
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary min-h-11 text-sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      </form>
      {message && <Status state={{ ok: message.ok, message: message.text }} />}
    </div>
  );
}

function AltForm({ target, img }: { target: "property" | "project"; img: Img }) {
  const [state, action] = useActionState(target === "property" ? updateImage.bind(null, img.id) : updateProjectImageAlt.bind(null, img.id), null);
  return (
    <form action={action} className="space-y-2">
      <label className="sr-only" htmlFor={`alt-${img.id}`}>Description</label>
      <input id={`alt-${img.id}`} name="alt" defaultValue={img.alt} className="field min-h-9 py-1.5 text-sm" required />
      <div className="flex items-center gap-2">
        {target === "property" && (
          <select name="kind" defaultValue={img.kind} className="field min-h-9 w-auto py-1 text-sm" aria-label="Image type">
            <option value="PHOTO">Photo</option>
            <option value="FLOOR_PLAN">Floor plan</option>
            <option value="SITE_PLAN">Site plan</option>
          </select>
        )}
        <Submit variant="outline" className="!min-h-9 !px-3">Save</Submit>
        {state && <span className={`text-xs ${state.ok ? "text-emerald" : "text-terracotta-deep"}`}>{state.errors?.alt ?? state.message}</span>}
      </div>
    </form>
  );
}
