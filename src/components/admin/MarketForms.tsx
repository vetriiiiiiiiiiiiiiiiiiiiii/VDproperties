"use client";

import { decideSubmission, reviewSubmission } from "@/app/admin/_actions/submissions";
import { updatePurchase } from "@/app/admin/_actions/purchases";
import { PURCHASE_STATUS_LABEL } from "@/lib/labels";
import { Area, Field, Select, Status, Submit, useFormAction } from "./kit";
import { AssigneeSelect, toLocalInput } from "./LeadForms";

/** Review steps any reviewer can take: start, ask for changes, record the inspection, or add an internal note. */
export function SubmissionReviewForm({ id, status }: { id: string; status: string }) {
  const { state, onSubmit, pending } = useFormAction(reviewSubmission.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Area label="Message to the seller" name="message" rows={3} maxLength={2000} state={state} hint="Shown in the seller's account. Required when asking for changes." />
      <Area label="Inspection notes (internal)" name="inspectionNotes" rows={3} maxLength={4000} state={state} hint="What you checked on site: boundaries, road, access, documents seen. Required to mark as inspected." />
      <div className="flex flex-wrap gap-2">
        {status === "SUBMITTED" && <Submit name="step" value="start" variant="outline" pending={pending}>Start review</Submit>}
        <Submit name="step" value="changes" variant="outline" pending={pending}>Ask seller for changes</Submit>
        <Submit name="step" value="inspected" variant="outline" pending={pending}>Mark as inspected</Submit>
        <Submit name="step" value="note" variant="outline" pending={pending}>Add internal note</Submit>
      </div>
    </form>
  );
}

/** Admin decision: approve into the catalogue (then finish and publish) or decline with a reason. */
export function SubmissionDecisionForm({ id, locationId, locations }: { id: string; locationId: string; locations: { id: string; label: string }[] }) {
  const { state, onSubmit, pending } = useFormAction(decideSubmission.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Select label="Catalogue location" name="locationId" defaultValue={locationId} state={state} hint="Decides the zone and which officers see it.">
        <option value="">Choose…</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
      </Select>
      <Area label="Message to the seller" name="message" rows={3} maxLength={2000} state={state} hint="Required when declining." />
      <div className="flex flex-wrap gap-2">
        <Submit name="decision" value="approve" pending={pending}>Approve and prepare listing</Submit>
        <Submit name="decision" value="reject" variant="danger" pending={pending}>Decline</Submit>
      </div>
    </form>
  );
}

export function PurchaseUpdateForm({
  id,
  status,
  assignedToId,
  scheduledFor,
  appointmentNote,
  followUpAt,
  staff,
  canChangeProperty,
}: {
  id: string;
  status: string;
  assignedToId: string | null;
  scheduledFor: string | null;
  appointmentNote: string;
  followUpAt: string | null;
  staff: { id: string; name: string }[];
  canChangeProperty: boolean;
}) {
  const { state, onSubmit, pending } = useFormAction(updatePurchase.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Select label="Status" name="status" defaultValue={status} state={state}>
        {Object.entries(PURCHASE_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </Select>
      <Field label="Confirmed appointment" name="scheduledFor" type="datetime-local" defaultValue={toLocalInput(scheduledFor)} state={state} hint="India Standard Time. Required for “Appointment confirmed”." />
      <Area label="Appointment details for the buyer" name="appointmentNote" defaultValue={appointmentNote} rows={2} maxLength={500} state={state} hint="Meeting point, office address or call link. Shown in the buyer's account once confirmed." />
      <AssigneeSelect staff={staff} value={assignedToId} state={state} />
      <Field label="Follow-up date" name="followUpAt" type="datetime-local" defaultValue={toLocalInput(followUpAt)} state={state} />
      {canChangeProperty && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="updateProperty" className="mt-0.5 h-4 w-4 accent-emerald" />
          <span>Also update the property: <strong>Booked</strong> reserves it, <strong>Sale completed</strong> marks it sold.</span>
        </label>
      )}
      <Submit pending={pending}>Update request</Submit>
    </form>
  );
}
