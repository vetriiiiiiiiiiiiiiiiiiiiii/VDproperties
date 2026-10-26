"use client";

import { saveAmenity, saveLocation } from "@/app/admin/_actions/catalogue";
import { Check, Field, Status, Submit, useFormAction } from "./kit";

export function LocationForm({ id, values }: { id: string | null; values?: { name: string; city: string; district: string; state: string; isServiceArea: boolean } }) {
  const { state, onSubmit, pending } = useFormAction(saveLocation.bind(null, id));
  const v = values ?? { name: "", city: "", district: "", state: "", isServiceArea: true };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Locality name" name="name" defaultValue={v.name} state={state} />
        <Field label="City / town" name="city" defaultValue={v.city} state={state} />
        <Field label="District" name="district" defaultValue={v.district} state={state} />
        <Field label="State" name="state" defaultValue={v.state} state={state} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Check label="We actively serve this area" name="isServiceArea" defaultChecked={v.isServiceArea} />
        <Submit variant={id ? "outline" : "primary"} pending={pending}>{id ? "Save" : "Add location"}</Submit>
      </div>
      <Status state={state} />
    </form>
  );
}

export function AmenityForm() {
  const { state, onSubmit, pending } = useFormAction(saveAmenity);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="New amenity" name="name" state={state} placeholder="e.g. Street lighting" />
      <Submit pending={pending}>Add</Submit>
      {state?.ok && <span className="text-sm text-emerald">{state.message}</span>}
    </form>
  );
}
