"use client";

import { useRef } from "react";
import { addNote, updateEnquiry, updateSiteVisit } from "@/app/admin/_actions/leads";
import { Area, Field, Select, Status, Submit, useFormAction } from "./kit";

type Staff = { id: string; name: string };

const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16).replace(" ", "T") : "");

export function EnquiryUpdateForm({ id, status, assignedToId, followUpAt, staff }: { id: string; status: string; assignedToId: string | null; followUpAt: string | null; staff: Staff[] }) {
  const { state, onSubmit, pending } = useFormAction(updateEnquiry.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Select label="Status" name="status" defaultValue={status} state={state}>
        <option value="NEW">New</option>
        <option value="CONTACTED">Contacted</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="CLOSED">Closed</option>
        <option value="SPAM">Spam</option>
      </Select>
      <AssigneeSelect staff={staff} value={assignedToId} state={state} />
      <Field label="Follow-up date" name="followUpAt" type="datetime-local" defaultValue={toLocalInput(followUpAt)} state={state} hint="Times are India Standard Time." />
      <Submit pending={pending}>Update enquiry</Submit>
    </form>
  );
}

export function VisitUpdateForm({ id, status, assignedToId, followUpAt, scheduledFor, staff }: { id: string; status: string; assignedToId: string | null; followUpAt: string | null; scheduledFor: string | null; staff: Staff[] }) {
  const { state, onSubmit, pending } = useFormAction(updateSiteVisit.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Select label="Status" name="status" defaultValue={status} state={state}>
        <option value="NEW">New</option>
        <option value="CONTACTED">Contacted</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </Select>
      <Field label="Confirmed visit date & time" name="scheduledFor" type="datetime-local" defaultValue={toLocalInput(scheduledFor)} state={state} hint="Fill in once agreed with the visitor. Required for “Scheduled”." />
      <AssigneeSelect staff={staff} value={assignedToId} state={state} />
      <Field label="Follow-up date" name="followUpAt" type="datetime-local" defaultValue={toLocalInput(followUpAt)} state={state} />
      <Submit pending={pending}>Update visit</Submit>
    </form>
  );
}

function AssigneeSelect({ staff, value, state }: { staff: Staff[]; value: string | null; state: Parameters<typeof Status>[0]["state"] }) {
  return (
    <Select label="Assigned to" name="assignedToId" defaultValue={value ?? ""} state={state}>
      <option value="">Unassigned</option>
      {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </Select>
  );
}

export function NoteForm({ target }: { target: { enquiryId?: string; siteVisitId?: string } }) {
  const ref = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useFormAction(async (prev, fd) => {
    const res = await addNote(target, prev, fd);
    if (res.ok) ref.current?.reset();
    return res;
  });
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <Area label="Add an internal note" name="body" rows={3} state={state} hint="Visible to staff only." />
      <div className="flex items-center gap-3">
        <Submit variant="outline" pending={pending}>Add note</Submit>
        {state && !state.errors && <span className={`text-sm ${state.ok ? "text-emerald" : "text-terracotta-deep"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
