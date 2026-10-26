"use client";

import { saveProject } from "@/app/admin/_actions/projects";
import { Area, Check, Field, Panel, Select, Status, Submit, useFormAction } from "./kit";

export type ProjectFormValues = {
  name: string; slug: string; status: "UPCOMING" | "ONGOING" | "COMPLETED"; publication: "DRAFT" | "PUBLISHED"; summary: string; description: string;
  locationId: string; localityLabel: string; highlights: string; approvalInfo: string; seoTitle: string; seoDescription: string; isSample: boolean;
};

export const EMPTY_PROJECT: ProjectFormValues = {
  name: "", slug: "", status: "ONGOING", publication: "DRAFT", summary: "", description: "", locationId: "", localityLabel: "",
  highlights: "", approvalInfo: "", seoTitle: "", seoDescription: "", isSample: false,
};

export function ProjectForm({ id, values: v, locations }: { id: string | null; values: ProjectFormValues; locations: { id: string; name: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(saveProject.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Status state={state} />
      <Panel title="Project">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Project name *" name="name" defaultValue={v.name} state={state} className="md:col-span-2" />
          <Select label="Status" name="status" defaultValue={v.status} state={state} hint="Keep this accurate — it's shown publicly.">
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
          </Select>
          <Field label="URL slug" name="slug" defaultValue={v.slug} state={state} hint="Leave blank to generate from the name." />
          <Area label="Summary" name="summary" defaultValue={v.summary} rows={2} maxLength={300} state={state} className="md:col-span-2" />
          <Area label="Description" name="description" defaultValue={v.description} rows={6} state={state} className="md:col-span-2" hint="Separate paragraphs with a blank line." />
          <Area label="Highlights" name="highlights" defaultValue={v.highlights} rows={4} state={state} hint="One verified highlight per line." />
          <Area label="Approvals & registration" name="approvalInfo" defaultValue={v.approvalInfo} rows={4} state={state} hint="Only details you hold documents for." />
          <Select label="Location" name="locationId" defaultValue={v.locationId} state={state}>
            <option value="">— None —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Field label="Locality shown publicly" name="localityLabel" defaultValue={v.localityLabel} state={state} />
          <Field label="SEO title" name="seoTitle" defaultValue={v.seoTitle} maxLength={70} state={state} />
          <Field label="SEO description" name="seoDescription" defaultValue={v.seoDescription} maxLength={170} state={state} />
          <div className="md:col-span-2"><Check label="This is sample content" name="isSample" defaultChecked={v.isSample} /></div>
        </div>
      </Panel>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border border-line bg-white/95 p-4">
        <Submit name="intent" value="save" pending={pending}>{id ? "Save changes" : "Save as draft"}</Submit>
        {v.publication === "PUBLISHED" ? (
          <Submit name="intent" value="unpublish" variant="outline" pending={pending}>Unpublish</Submit>
        ) : (
          <Submit name="intent" value="publish" variant="gold" pending={pending}>{id ? "Publish" : "Save & publish"}</Submit>
        )}
        <span className="text-sm text-slate">Status: <strong>{v.publication === "PUBLISHED" ? "Published" : "Draft"}</strong></span>
      </div>
    </form>
  );
}
