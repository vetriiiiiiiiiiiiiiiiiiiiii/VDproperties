"use client";

import { addPassportItems, saveCostCard, saveDeveloper, savePlotfitWeights, saveTwinData, updatePassportItem } from "@/app/admin/_actions/platform";
import { Area, Check, Field, Select, Status, Submit, useFormAction } from "./kit";

export type TwinValues = {
  plotWidthFt: string; plotDepthFt: string; frontBearing: string; setbackFrontFt: string; setbackRearFt: string; setbackSideFt: string; maxCoveragePct: string;
  siteConstraints: string; boundaryStatus: string; boundarySource: string; boundary: string; facilities: string; developerId: string;
};

export function TwinDataForm({ propertyId, v, developers }: { propertyId: string; v: TwinValues; developers: { id: string; name: string; authorised: boolean }[] }) {
  const { state, onSubmit, pending } = useFormAction(saveTwinData.bind(null, propertyId));
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Status state={state} />
      <p className="text-sm text-slate">Only enter measurements from survey records or documents. Studio, PlotFit and the Twin all read these values; empty fields stay “not on record”.</p>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Frontage (ft)" name="plotWidthFt" defaultValue={v.plotWidthFt} inputMode="decimal" state={state} hint="Road-side edge" />
        <Field label="Depth (ft)" name="plotDepthFt" defaultValue={v.plotDepthFt} inputMode="decimal" state={state} />
        <Field label="Road edge faces (°)" name="frontBearing" defaultValue={v.frontBearing} inputMode="decimal" state={state} hint="0 = north, 90 = east. Leave empty if unknown." />
        <Field label="Max ground coverage (%)" name="maxCoveragePct" defaultValue={v.maxCoveragePct} inputMode="decimal" state={state} hint="Only from local rules" />
        <Field label="Front setback (ft)" name="setbackFrontFt" defaultValue={v.setbackFrontFt} inputMode="decimal" state={state} />
        <Field label="Rear setback (ft)" name="setbackRearFt" defaultValue={v.setbackRearFt} inputMode="decimal" state={state} />
        <Field label="Side setback (ft)" name="setbackSideFt" defaultValue={v.setbackSideFt} inputMode="decimal" state={state} />
        <Select label="Developer" name="developerId" defaultValue={v.developerId} state={state}>
          <option value="">— None —</option>
          {developers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.authorised ? "" : " (not authorised)"}</option>)}
        </Select>
      </div>
      <Area label="Known site constraints" name="siteConstraints" defaultValue={v.siteConstraints} rows={2} state={state} />
      <div className="grid gap-4 md:grid-cols-3">
        <Select label="Boundary reliability" name="boundaryStatus" defaultValue={v.boundaryStatus} state={state} hint="“Surveyed” only with a survey record">
          <option value="NONE">No boundary</option>
          <option value="APPROXIMATE">Approximate outline</option>
          <option value="SURVEYED">Surveyed</option>
        </Select>
        <Field label="Boundary source" name="boundarySource" defaultValue={v.boundarySource} state={state} className="md:col-span-2" hint="e.g. Survey sketch no. … dated …" />
      </div>
      <Area label="Boundary points" name="boundary" defaultValue={v.boundary} rows={4} state={state} hint="One “latitude, longitude” per line, in order around the plot. Shown publicly only when the exact location is authorised." />
      <Area label="Nearby facilities" name="facilities" defaultValue={v.facilities} rows={4} state={state} hint="One per line: Name | kind (school, hospital, transport, market, highway) | distance km | EXISTING / PROPOSED / UNCONFIRMED | source" />
      <Submit pending={pending}>Save Twin data</Submit>
    </form>
  );
}

const STATUS_OPTIONS = [["NOT_PROVIDED", "Not provided"], ["RECEIVED", "Received"], ["UNDER_REVIEW", "Under review"], ["REVIEWED", "Reviewed"], ["NEEDS_FOLLOW_UP", "Needs follow-up"]];

export function PassportItemForm({ item, documents }: { item: { id: string; documentType: string; status: string; documentId: string; publicNote: string; privateNote: string; customerVisible: boolean; reviewed: string }; documents: { id: string; title: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(updatePassportItem.bind(null, item.id));
  return (
    <form onSubmit={onSubmit} className="grid gap-3 border-b border-line py-4 md:grid-cols-6">
      <div className="md:col-span-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{item.documentType}</p>
        {item.reviewed && <p className="text-xs text-slate">{item.reviewed}</p>}
      </div>
      <Select label="Status" name="status" defaultValue={item.status} state={state}>{STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      <Select label="Evidence document" name="documentId" defaultValue={item.documentId} state={state} className="md:col-span-2">
        <option value="">— None —</option>
        {documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
      </Select>
      <Field label="Note for customers" name="publicNote" defaultValue={item.publicNote} state={state} className="md:col-span-3" />
      <Field label="Staff-only note" name="privateNote" defaultValue={item.privateNote} state={state} className="md:col-span-4" />
      <div className="flex flex-wrap items-end gap-3 md:col-span-2">
        <Check label="Show on Twin" name="customerVisible" defaultChecked={item.customerVisible} />
        <Submit variant="outline" pending={pending} className="!min-h-9">Save</Submit>
      </div>
      {state && <p className={`text-xs md:col-span-6 ${state.ok ? "text-emerald" : "text-terracotta-deep"}`} role="status">{state.errors ? Object.values(state.errors)[0] : state.message}</p>}
    </form>
  );
}

export function PassportAddForm({ propertyId }: { propertyId: string }) {
  const { state, onSubmit, pending } = useFormAction(addPassportItems.bind(null, propertyId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Add document type" name="documentType" state={state} placeholder="e.g. Conversion order" />
      <Check label="Add the standard list" name="defaults" />
      <Submit variant="outline" pending={pending}>Add</Submit>
      {state && <span className={`text-sm ${state.ok ? "text-emerald" : "text-terracotta-deep"}`}>{state.message}</span>}
    </form>
  );
}

const CARD_TEXT = ["name", "finish", "locationId", "constructionPerSqft", "foundationPerSqft", "sitePreparation", "utilitiesConnection", "registrationPct", "landscapingPerSqft", "parkingPerSlot", "contingencyPct", "source", "effectiveDate", "notes"] as const;
export type CardValues = Record<(typeof CARD_TEXT)[number], string> & { isDemo: boolean; active: boolean };

export function CostCardForm({ id, v, locations }: { id: string | null; v: CardValues; locations: { id: string; name: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(saveCostCard.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Status state={state} />
      <div className="grid gap-4 md:grid-cols-4">
        <Field label="Card name" name="name" defaultValue={v.name} state={state} className="md:col-span-2" />
        <Select label="Finish level" name="finish" defaultValue={v.finish} state={state}>
          <option value="BASIC">Basic</option><option value="STANDARD">Standard</option><option value="PREMIUM">Premium</option>
        </Select>
        <Select label="Location" name="locationId" defaultValue={v.locationId} state={state}>
          <option value="">All locations (default)</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <Field label="Construction ₹/sq ft" name="constructionPerSqft" defaultValue={v.constructionPerSqft} inputMode="decimal" state={state} />
        <Field label="Foundation ₹/sq ft footprint" name="foundationPerSqft" defaultValue={v.foundationPerSqft} inputMode="decimal" state={state} />
        <Field label="Site preparation ₹" name="sitePreparation" defaultValue={v.sitePreparation} inputMode="decimal" state={state} />
        <Field label="Utility connections ₹" name="utilitiesConnection" defaultValue={v.utilitiesConnection} inputMode="decimal" state={state} />
        <Field label="Registration & transaction %" name="registrationPct" defaultValue={v.registrationPct} inputMode="decimal" state={state} />
        <Field label="Landscaping ₹/sq ft" name="landscapingPerSqft" defaultValue={v.landscapingPerSqft} inputMode="decimal" state={state} />
        <Field label="Parking ₹/space" name="parkingPerSlot" defaultValue={v.parkingPerSlot} inputMode="decimal" state={state} />
        <Field label="Contingency %" name="contingencyPct" defaultValue={v.contingencyPct} inputMode="decimal" state={state} />
        <Field label="Source of these rates *" name="source" defaultValue={v.source} state={state} className="md:col-span-3" hint="Shown to customers next to every estimate" />
        <Field label="Effective date" name="effectiveDate" type="date" defaultValue={v.effectiveDate} state={state} />
      </div>
      <Area label="Notes" name="notes" defaultValue={v.notes} rows={2} state={state} />
      <div className="flex flex-wrap gap-6">
        <Check label="Active" name="active" defaultChecked={v.active} />
        <Check label="Demonstration rates (labelled “not market data”)" name="isDemo" defaultChecked={v.isDemo} />
      </div>
      <Submit pending={pending}>{id ? "Save rate card" : "Add rate card"}</Submit>
    </form>
  );
}

export function DeveloperForm({ id, v }: { id: string | null; v: { name: string; contact: string; notes: string; authorised: boolean } }) {
  const { state, onSubmit, pending } = useFormAction(saveDeveloper.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4 md:items-end">
      <Field label="Developer" name="name" defaultValue={v.name} state={state} />
      <Field label="Contact" name="contact" defaultValue={v.contact} state={state} />
      <Field label="Notes" name="notes" defaultValue={v.notes} state={state} />
      <div className="flex items-center gap-3">
        <Check label="Authorised" name="authorised" defaultChecked={v.authorised} />
        <Submit variant={id ? "outline" : "primary"} pending={pending} className="!min-h-10">{id ? "Save" : "Add"}</Submit>
      </div>
      {state && <p className={`text-sm md:col-span-4 ${state.ok ? "text-emerald" : "text-terracotta-deep"}`}>{state.message}</p>}
    </form>
  );
}

export function WeightsForm({ weights }: { weights: Record<string, number> }) {
  const { state, onSubmit, pending } = useFormAction(savePlotfitWeights);
  const labels: Record<string, string> = { budget: "Budget fit", location: "Location preference", size: "Plot / built-up size", house: "Fit for the intended house", infrastructure: "Recorded infrastructure & facilities", completeness: "Record completeness & reviewed documents" };
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(labels).map(([k, l]) => <Field key={k} label={l} name={k} type="number" min={0} max={100} defaultValue={String(weights[k])} state={state} />)}
      </div>
      <Submit pending={pending}>Save weights</Submit>
    </form>
  );
}
