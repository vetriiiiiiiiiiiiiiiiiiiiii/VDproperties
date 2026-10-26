"use client";

import { saveZone } from "@/app/admin/_actions/zones";
import { Field, Status, Submit, useFormAction } from "./kit";

type Loc = { id: string; name: string; city: string | null; zoneId: string | null; zoneName: string | null };

/** Create or edit a zone and tick the locations it covers. Ticking a location from another zone moves it here. */
export function ZoneForm({ zone, locations }: { zone?: { id: string; name: string; description: string | null }; locations: Loc[] }) {
  const { state, onSubmit, pending } = useFormAction(saveZone.bind(null, zone?.id ?? null));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Zone name" name="name" defaultValue={zone?.name} state={state} placeholder="North zone" />
        <Field label="Description (optional)" name="description" defaultValue={zone?.description ?? ""} state={state} />
      </div>
      <fieldset>
        <legend className="field-label">Locations in this zone</legend>
        {locations.length === 0 ? (
          <p className="text-sm text-slate">Add locations under Locations & amenities first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locations.map((l) => (
              <label key={l.id} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
                <input type="checkbox" name="locationIds" value={l.id} defaultChecked={!!zone && l.zoneId === zone.id} className="accent-emerald" />
                {l.name}{l.city ? `, ${l.city}` : ""}
                {l.zoneId && l.zoneId !== zone?.id && <span className="text-xs text-slate">(in {l.zoneName})</span>}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <Submit pending={pending} variant={zone ? "outline" : "primary"}>{zone ? "Save zone" : "Create zone"}</Submit>
    </form>
  );
}
