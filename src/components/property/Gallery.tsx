"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Media } from "@/components/site/Media";
import { useI18n } from "@/i18n/client";

export type GalleryImage = { url: string; alt: string; kind: "PHOTO" | "FLOOR_PLAN" | "SITE_PLAN" };


export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const { t } = useI18n();
  const g = t.listings.gallery;
  const KIND = t.labels.imageKind;
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const list = images.length ? images : [{ url: "placeholder:elevation", alt: g.noPhotos(title), kind: "PHOTO" as const }];

  const close = useCallback(() => {
    setIndex(null);
    openerRef.current?.focus();
  }, []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + list.length) % list.length)), [list.length]);

  useEffect(() => {
    if (index === null) return;
    dialogRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [index, close, step]);

  const open = (i: number, el: HTMLButtonElement) => {
    openerRef.current = el;
    setIndex(i);
  };

  const [main, ...rest] = list;
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <button type="button" onClick={(e) => open(0, e.currentTarget)} className={`blob-mask group relative aspect-[4/3] sm:row-span-2 sm:aspect-auto sm:min-h-[28rem] ${rest.length ? "sm:col-span-3" : "sm:col-span-4"}`} aria-label={g.viewFull(main.alt)}>
          <Media src={main.url} alt={main.alt} priority sizes="(min-width:1024px) 60vw, 100vw" />
          <span className="glass-dark annot-plain absolute bottom-3 right-3 rounded-full px-3.5 py-1.5 text-ivory">{list.length > 1 ? g.viewAll(list.length) : g.enlarge}</span>
        </button>
        {rest.slice(0, 2).map((img, i) => (
          <button key={img.url + i} type="button" onClick={(e) => open(i + 1, e.currentTarget)} className={`blob-mask relative hidden aspect-[4/3] sm:block sm:aspect-auto ${rest.length === 1 ? "sm:row-span-2" : ""}`} aria-label={g.viewFull(img.alt)}>
            <Media src={img.url} alt={img.alt} sizes="20vw" />
            {img.kind !== "PHOTO" && <span className="annot-plain absolute left-2 top-2 rounded-full bg-white px-2.5 py-1 text-ink">{KIND[img.kind]}</span>}
          </button>
        ))}
      </div>
      {list.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto sm:hidden" aria-label={g.more}>
          {rest.map((img, i) => (
            <li key={img.url + i} className="shrink-0">
              <button type="button" onClick={(e) => open(i + 1, e.currentTarget)} className="relative block h-16 w-24 overflow-hidden rounded-2xl" aria-label={g.viewFull(img.alt)}>
                <Media src={img.url} alt="" sizes="96px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {index !== null && (
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={g.dialog(title, index + 1, list.length)} className="fixed inset-0 z-[60] flex flex-col bg-ink/95 text-ivory outline-none">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="annot-plain" aria-live="polite">
              {index + 1} / {list.length} · {KIND[list[index].kind]}
            </p>
            <button type="button" onClick={close} className="inline-flex h-11 items-center gap-2 rounded-full border border-ivory/30 px-4 text-sm">
              {g.close} <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div className="relative mx-auto w-full max-w-6xl flex-1">
            <div key={index} className="absolute inset-4 animate-[fade_.35s_ease]">
              <Media src={list[index].url} alt={list[index].alt} sizes="100vw" className="!object-contain" />
            </div>
          </div>
          <p className="px-4 pb-2 text-center text-sm text-ivory/75">{list[index].alt}</p>
          {list.length > 1 && (
            <div className="flex justify-center gap-3 pb-6">
              <button type="button" onClick={() => step(-1)} className="h-11 rounded-full border border-ivory/30 px-5" aria-label={g.prev}>←</button>
              <button type="button" onClick={() => step(1)} className="h-11 rounded-full border border-ivory/30 px-5" aria-label={g.next}>→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
