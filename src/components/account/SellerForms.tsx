"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createListing, removeListingFile, updateListing, withdrawListing } from "@/app/account/_actions/listings";
import { Area, Field, Select, Status, Submit, useFormAction } from "@/components/admin/kit";
import { useI18n } from "@/i18n/client";

export type SellerValues = {
  type: string;
  title: string;
  description: string;
  locationId: string;
  sellerLocationText: string;
  localityLabel: string;
  sellerAddress: string;
  landAreaSqft: string;
  plotDimensions: string;
  facing: string;
  builtUpAreaSqft: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  accessRoad: string;
  approvalInfo: string;
  expectedPrice: string;
  sellerRelation: string;
  name: string;
  phone: string;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="surface p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <p className="annot text-emerald">{title}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** The owner's listing form, used for a new submission and for edits while it's still editable. */
export function SellerListingForm({ id, values, locations, resubmit = false }: { id?: string; values: SellerValues; locations: { id: string; label: string }[]; resubmit?: boolean }) {
  const { t } = useI18n();
  const f = t.market.form;
  const { state, onSubmit, pending } = useFormAction(id ? updateListing.bind(null, id) : createListing);
  const [type, setType] = useState(values.type || "RESIDENTIAL_PLOT");
  const [loc, setLoc] = useState(values.locationId || (values.sellerLocationText ? "__other" : (locations[0]?.id ?? "__other")));
  const home = type === "HOUSE" || type === "VILLA";
  const opt = (label: string) => `${label} ${f.optional}`;
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Status state={state} />
      <Section title={f.sections.property}>
        <Select label={f.type} name="type" value={type} onChange={(e) => setType(e.target.value)} state={state}>
          {(["RESIDENTIAL_PLOT", "LAND", "HOUSE", "VILLA"] as const).map((k) => <option key={k} value={k}>{t.labels.propertyType[k]}</option>)}
        </Select>
        <Field label={f.title} name="title" defaultValue={values.title} hint={f.titleHint} maxLength={120} state={state} />
        <Area label={opt(f.description)} name="description" defaultValue={values.description} hint={f.descriptionHint} rows={4} maxLength={4000} state={state} className="md:col-span-2" />
      </Section>

      <Section title={f.sections.location}>
        <Select label={f.location} name="locationId" value={loc === "__other" ? "" : loc} onChange={(e) => setLoc(e.target.value || "__other")} state={state}>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          <option value="">{f.locationNone}</option>
        </Select>
        {loc === "__other" || !locations.length ? <Field label={f.locationText} name="sellerLocationText" defaultValue={values.sellerLocationText} maxLength={120} state={state} /> : <div />}
        <Field label={opt(f.locality)} name="localityLabel" defaultValue={values.localityLabel} hint={f.localityHint} maxLength={120} state={state} />
        <Field label={f.address} name="sellerAddress" defaultValue={values.sellerAddress} hint={f.addressHint} maxLength={300} state={state} />
      </Section>

      <Section title={f.sections.size}>
        <Field label={opt(f.landArea)} name="landAreaSqft" type="number" min={0} inputMode="numeric" defaultValue={values.landAreaSqft} state={state} />
        <Field label={opt(f.dimensions)} name="plotDimensions" defaultValue={values.plotDimensions} hint={f.dimensionsHint} maxLength={60} state={state} />
        <Field label={opt(f.facing)} name="facing" defaultValue={values.facing} maxLength={40} state={state} />
        <Field label={opt(f.accessRoad)} name="accessRoad" defaultValue={values.accessRoad} hint={f.accessRoadHint} maxLength={120} state={state} />
        {home && (
          <>
            <Field label={opt(f.builtUp)} name="builtUpAreaSqft" type="number" min={0} inputMode="numeric" defaultValue={values.builtUpAreaSqft} state={state} />
            <Field label={opt(f.bedrooms)} name="bedrooms" type="number" min={0} max={30} defaultValue={values.bedrooms} state={state} />
            <Field label={opt(f.bathrooms)} name="bathrooms" type="number" min={0} max={30} defaultValue={values.bathrooms} state={state} />
            <Field label={opt(f.floors)} name="floors" type="number" min={0} max={20} defaultValue={values.floors} state={state} />
          </>
        )}
        <Area label={opt(f.approvals)} name="approvalInfo" defaultValue={values.approvalInfo} hint={f.approvalsHint} rows={3} maxLength={1000} state={state} className="md:col-span-2" />
      </Section>

      <Section title={f.sections.price}>
        <Field label={opt(f.price)} name="expectedPrice" type="number" min={0} step={10000} inputMode="numeric" defaultValue={values.expectedPrice} hint={f.priceHint} state={state} />
      </Section>

      <Section title={f.sections.you}>
        <Field label={f.name} name="name" defaultValue={values.name} autoComplete="name" state={state} />
        <Field label={f.phone} name="phone" type="tel" defaultValue={values.phone} autoComplete="tel" state={state} />
        <Select label={f.relation} name="sellerRelation" defaultValue={values.sellerRelation || "OWNER"} state={state}>
          {Object.entries(f.relations).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <div />
        <label className="flex items-start gap-3 text-sm md:col-span-2">
          <input type="checkbox" name="declaration" className="mt-0.5 h-5 w-5 shrink-0 accent-emerald" aria-invalid={state?.errors?.declaration ? true : undefined} />
          <span>
            {f.declaration}
            {state?.errors?.declaration && <span className="field-error block">{state.errors.declaration}</span>}
          </span>
        </label>
      </Section>

      <Submit pending={pending}>{!id ? f.submit : resubmit ? f.resubmit : f.save}</Submit>
    </form>
  );
}

type UploadedImage = { id: string; url: string };
type UploadedDoc = { id: string; title: string };

/** Photo and PDF uploads for an editable listing. Each file is sent on its own so one failure doesn't lose the rest. */
export function SellerFiles({ id, images, documents, editable, maxPhotos, maxDocs }: { id: string; images: UploadedImage[]; documents: UploadedDoc[]; editable: boolean; maxPhotos: number; maxDocs: number }) {
  const { t } = useI18n();
  const d = t.market.detail;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const [docTitle, setDocTitle] = useState("");

  async function send(file: File, kind: "image" | "document") {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    if (kind === "document") fd.set("title", docTitle);
    // The server answers in the page's language (it reads the referring page).
    const res = await fetch(`/api/account/listings/${id}/files`, { method: "POST", body: fd });
    const body = await res.json().catch(() => ({ ok: false, message: "Upload failed" }));
    if (!body.ok) throw new Error(body.message);
  }

  async function upload(files: FileList | null, kind: "image" | "document") {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) await send(file, kind);
      if (kind === "document") setDocTitle("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (photoInput.current) photoInput.current.value = "";
      if (docInput.current) docInput.current.value = "";
      router.refresh();
    }
  }

  const remove = (kind: "image" | "document", fileId: string) =>
    start(async () => {
      const r = await removeListingFile(kind, fileId);
      if (!r.ok) setError(r.message);
      router.refresh();
    });

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="border-l-4 border-terracotta bg-white p-3 text-sm text-terracotta-deep">{error}</p>}
      <section>
        <h2 className="annot text-emerald">{d.photos}</h2>
        <p className="mt-2 text-sm text-slate">{d.photosHint(maxPhotos)}</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              {editable && (
                <button type="button" onClick={() => remove("image", img.id)} className="absolute right-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-terracotta-deep">
                  {d.remove}
                </button>
              )}
            </li>
          ))}
        </ul>
        {editable && images.length < maxPhotos && (
          <label className="btn btn-outline mt-4 cursor-pointer text-navy">
            {busy ? d.uploading : d.addPhotos}
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files, "image")} />
          </label>
        )}
      </section>
      <section>
        <h2 className="annot text-emerald">{d.documents}</h2>
        <p className="mt-2 text-sm text-slate">{d.documentsHint(maxDocs)}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5">
              <a href={`/documents/${doc.id}`} target="_blank" rel="noopener" className="underline">{doc.title} (PDF)</a>
              {editable && <button type="button" onClick={() => remove("document", doc.id)} className="text-xs font-semibold text-terracotta-deep">{d.remove}</button>}
            </li>
          ))}
        </ul>
        {editable && documents.length < maxDocs && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="field-label">{d.docTitle}</span>
              <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} maxLength={80} className="field min-h-11" />
            </label>
            <label className={`btn btn-outline cursor-pointer text-navy ${docTitle.trim().length < 2 ? "pointer-events-none opacity-50" : ""}`}>
              {busy ? d.uploading : d.addDocument}
              <input ref={docInput} type="file" accept="application/pdf" className="sr-only" disabled={busy || docTitle.trim().length < 2} onChange={(e) => upload(e.target.files, "document")} />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}

export function WithdrawListing({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="text-sm text-terracotta-deep underline"
        onClick={() => {
          if (!window.confirm(t.market.detail.withdrawConfirm)) return;
          start(async () => {
            const r = await withdrawListing(id);
            setMsg(r.message);
            router.refresh();
          });
        }}
      >
        {t.market.detail.withdraw}
      </button>
      {msg && <p role="status" className="mt-1 text-xs text-slate">{msg}</p>}
    </div>
  );
}
