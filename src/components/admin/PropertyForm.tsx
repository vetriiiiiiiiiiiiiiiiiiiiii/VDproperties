"use client";

import { useState } from "react";
import { saveProperty } from "@/app/admin/_actions/properties";
import { Area, Check, Field, Panel, Select, Status, Submit, useFormAction } from "./kit";

export type PropertyFormValues = {
  title: string;
  slug: string;
  referenceCode: string;
  type: "RESIDENTIAL_PLOT" | "LAND" | "HOUSE" | "VILLA";
  availability: "AVAILABLE" | "RESERVED" | "SOLD" | "UNAVAILABLE";
  publication: "DRAFT" | "PUBLISHED";
  featured: boolean;
  isSample: boolean;
  summary: string;
  description: string;
  locationId: string;
  localityLabel: string;
  latitude: string;
  longitude: string;
  showExactLocation: boolean;
  mapUrl: string;
  priceAmount: string;
  priceDisplay: "SHOW_PRICE" | "CONTACT_FOR_PRICE";
  priceNote: string;
  landAreaSqft: string;
  landAreaLabel: string;
  plotDimensions: string;
  facing: string;
  builtUpAreaSqft: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  accessRoad: string;
  utilities: string;
  developmentStatus: string;
  constructionSpecs: string;
  approvalInfo: string;
  projectId: string;
  seoTitle: string;
  seoDescription: string;
  amenityIds: string[];
};

export const EMPTY_PROPERTY: PropertyFormValues = {
  title: "", slug: "", referenceCode: "", type: "RESIDENTIAL_PLOT", availability: "AVAILABLE", publication: "DRAFT",
  featured: false, isSample: false, summary: "", description: "", locationId: "", localityLabel: "", latitude: "", longitude: "",
  showExactLocation: false, mapUrl: "", priceAmount: "", priceDisplay: "SHOW_PRICE", priceNote: "", landAreaSqft: "", landAreaLabel: "",
  plotDimensions: "", facing: "", builtUpAreaSqft: "", bedrooms: "", bathrooms: "", floors: "", accessRoad: "", utilities: "",
  developmentStatus: "", constructionSpecs: "", approvalInfo: "", projectId: "", seoTitle: "", seoDescription: "", amenityIds: [],
};

export function PropertyForm({
  id,
  values,
  locations,
  amenities,
  projects,
  canPublish = true,
}: {
  canPublish?: boolean;
  id: string | null;
  values: PropertyFormValues;
  locations: { id: string; name: string; city: string | null }[];
  amenities: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const { state, onSubmit, pending } = useFormAction(saveProperty.bind(null, id));
  const [type, setType] = useState(values.type);
  const [priceDisplay, setPriceDisplay] = useState(values.priceDisplay);
  const home = type === "HOUSE" || type === "VILLA";
  const v = values;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Status state={state} />

      <Panel title="Listing" description="What visitors see first.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Title *" name="title" defaultValue={v.title} state={state} required className="md:col-span-2" />
          <Select label="Property type *" name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} state={state}>
            <option value="RESIDENTIAL_PLOT">Residential plot</option>
            <option value="LAND">Land</option>
            <option value="HOUSE">House</option>
            <option value="VILLA">Villa</option>
          </Select>
          <Select label="Availability" name="availability" defaultValue={v.availability} state={state}>
            <option value="AVAILABLE">Available</option>
            <option value="RESERVED">Reserved</option>
            <option value="SOLD">Sold</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </Select>
          <Area label="Summary" name="summary" defaultValue={v.summary} state={state} rows={2} maxLength={300} hint="One or two sentences shown at the top of the listing." className="md:col-span-2" />
          <Area label="Description" name="description" defaultValue={v.description} state={state} rows={7} hint="Separate paragraphs with a blank line. Only include details you've verified." className="md:col-span-2" />
          <Field label="Property ID" name="referenceCode" defaultValue={v.referenceCode} state={state} hint={id ? "Shown to visitors." : "Leave blank to generate the next ID automatically."} />
          <Field label="URL slug" name="slug" defaultValue={v.slug} state={state} hint="Leave blank to generate from the title." />
          <div className="flex flex-col gap-3 md:col-span-2">
            <Check label="Feature on the homepage" name="featured" defaultChecked={v.featured} />
            <Check label="This is sample content" name="isSample" defaultChecked={v.isSample} hint="Sample listings show a visible “Sample listing” label and aren't indexed by search engines." />
          </div>
        </div>
      </Panel>

      <Panel title="Price">
        <div className="grid gap-5 md:grid-cols-3">
          <Select label="Price visibility" name="priceDisplay" value={priceDisplay} onChange={(e) => setPriceDisplay(e.target.value as typeof priceDisplay)} state={state}>
            <option value="SHOW_PRICE">Show the price</option>
            <option value="CONTACT_FOR_PRICE">Contact for price</option>
          </Select>
          <Field
            label={priceDisplay === "SHOW_PRICE" ? "Asking price (₹) *" : "Internal price (₹)"}
            name="priceAmount"
            type="number"
            min={0}
            step={1000}
            defaultValue={v.priceAmount}
            state={state}
            hint={priceDisplay === "SHOW_PRICE" ? "Full amount in rupees, e.g. 2450000" : "Optional. Never shown publicly or used in public filters."}
          />
          <Field label="Price note" name="priceNote" defaultValue={v.priceNote} state={state} hint="e.g. Negotiable, plus registration" />
        </div>
      </Panel>

      <Panel title={home ? "Home details" : "Land details"} description="Fields left empty are hidden on the website.">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Land / plot area (sq ft)" name="landAreaSqft" type="number" min={0} defaultValue={v.landAreaSqft} state={state} hint="Used for area filters." />
          <Field label="Area as displayed" name="landAreaLabel" defaultValue={v.landAreaLabel} state={state} hint="Optional, e.g. 5 cents or 2.4 grounds" />
          <Field label="Plot dimensions" name="plotDimensions" defaultValue={v.plotDimensions} state={state} hint="e.g. 30 ft × 40 ft" />
          <Field label="Facing" name="facing" defaultValue={v.facing} state={state} />
          <Field label="Access road" name="accessRoad" defaultValue={v.accessRoad} state={state} hint="e.g. 30 ft tar road" />
          <Field label="Development status" name="developmentStatus" defaultValue={v.developmentStatus} state={state} />
          {home && (
            <>
              <Field label="Built-up area (sq ft)" name="builtUpAreaSqft" type="number" min={0} defaultValue={v.builtUpAreaSqft} state={state} />
              <Field label="Bedrooms" name="bedrooms" type="number" min={0} defaultValue={v.bedrooms} state={state} />
              <Field label="Bathrooms" name="bathrooms" type="number" min={0} defaultValue={v.bathrooms} state={state} />
              <Field label="Floors" name="floors" type="number" min={0} defaultValue={v.floors} state={state} />
            </>
          )}
          <Area label="Utilities & infrastructure" name="utilities" defaultValue={v.utilities} state={state} rows={3} className="md:col-span-3" />
          {home && <Area label="Construction specifications" name="constructionSpecs" defaultValue={v.constructionSpecs} state={state} rows={4} className="md:col-span-3" />}
          <Area label="Approvals & registration" name="approvalInfo" defaultValue={v.approvalInfo} state={state} rows={3} hint="Only enter approval or registration details you hold documents for." className="md:col-span-3" />
        </div>
        {amenities.length > 0 && (
          <fieldset className="mt-6">
            <legend className="field-label">Amenities & infrastructure (verified)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="amenityIds" value={a.id} defaultChecked={v.amenityIds.includes(a.id)} className="h-4 w-4 accent-emerald" />
                  {a.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Panel>

      <Panel title="Location">
        <div className="grid gap-5 md:grid-cols-2">
          <Select label="Location" name="locationId" defaultValue={v.locationId} state={state} hint="Manage the list under Locations & amenities.">
            <option value="">— None —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}{l.city ? `, ${l.city}` : ""}</option>
            ))}
          </Select>
          <Field label="Locality shown publicly" name="localityLabel" defaultValue={v.localityLabel} state={state} hint="Area or neighbourhood — not a private street address." />
          <Field label="Map link (https)" name="mapUrl" type="url" defaultValue={v.mapUrl} state={state} hint="Optional link to the general area." className="md:col-span-2" />
          <Field label="Latitude" name="latitude" inputMode="decimal" defaultValue={v.latitude} state={state} />
          <Field label="Longitude" name="longitude" inputMode="decimal" defaultValue={v.longitude} state={state} />
          <div className="md:col-span-2">
            <Check label="Show the exact location on a public map" name="showExactLocation" defaultChecked={v.showExactLocation} hint="Only tick this if the owner has authorised publishing precise coordinates." />
          </div>
        </div>
      </Panel>

      <Panel title="Project & search engines">
        <div className="grid gap-5 md:grid-cols-2">
          <Select label="Part of project" name="projectId" defaultValue={v.projectId} state={state}>
            <option value="">— Not in a project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <div />
          <Field label="SEO title" name="seoTitle" defaultValue={v.seoTitle} maxLength={70} state={state} hint="Optional. Defaults to the listing title and locality." />
          <Field label="SEO description" name="seoDescription" defaultValue={v.seoDescription} maxLength={170} state={state} hint="Optional. Defaults to the summary." />
        </div>
      </Panel>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border border-line bg-white/95 p-4 backdrop-blur">
        <Submit name="intent" value="save" pending={pending}>{id ? "Save changes" : "Save as draft"}</Submit>
        {!canPublish ? (
          <span className="text-sm text-slate">An Admin publishes listings.</span>
        ) : v.publication === "PUBLISHED" ? (
          <Submit name="intent" value="unpublish" variant="outline" pending={pending}>Unpublish</Submit>
        ) : (
          <Submit name="intent" value="publish" variant="gold" pending={pending}>{id ? "Publish" : "Save & publish"}</Submit>
        )}
        <span className="text-sm text-slate">Status: <strong>{v.publication === "PUBLISHED" ? "Published" : "Draft"}</strong></span>
      </div>
    </form>
  );
}
