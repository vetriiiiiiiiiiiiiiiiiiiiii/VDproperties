"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  addBudgetLine,
  addHandoverItem,
  createBuildProject,
  decideChange,
  proposeChange,
  recordPayment,
  replyQuestion,
  saveMilestone,
  updateBuildProject,
} from "@/app/admin/_actions/buildtrace";
import { Area, Check, Field, Select, Status, Submit, useFormAction } from "./kit";

type Opt = { id: string; label: string };

export function CreateProjectForm({ customers, properties, managers, stages }: { customers: Opt[]; properties: Opt[]; managers: Opt[]; stages: string[] }) {
  const { state, onSubmit, pending } = useFormAction(createBuildProject);
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Status state={state} />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Project title *" name="title" state={state} className="md:col-span-2" placeholder="e.g. Two-storey home on VDP-0012" />
        <Select label="Customer account *" name="customerId" state={state} defaultValue="" hint="The customer must have registered an account on the website.">
          <option value="" disabled>Choose…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
        <Select label="Property" name="propertyId" state={state} defaultValue="">
          <option value="">— Customer's own land / not listed —</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
        <Select label="Project manager" name="managerId" state={state} defaultValue="">
          <option value="">— Assign later —</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
        <Field label="Contractor" name="contractorName" state={state} />
        <Area label="Agreed scope *" name="scope" state={state} rows={4} className="md:col-span-2" />
        <Field label="Contract value (₹) *" name="contractValue" inputMode="numeric" state={state} />
        <div />
        <Field label="Planned start *" name="plannedStart" type="date" state={state} />
        <Field label="Planned completion *" name="plannedEnd" type="date" state={state} />
      </div>
      <fieldset className="border border-gold bg-gold/5 p-4">
        <legend className="px-1 text-sm font-semibold">Authorisation</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Agreement reference *" name="agreementRef" state={state} placeholder="e.g. Construction agreement no. / file ref" />
          <Field label="Agreement date *" name="agreementDate" type="date" state={state} />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" name="agreementConfirmed" className="mt-0.5 h-4 w-4 accent-emerald" />
          <span>I confirm a signed construction agreement or written authorisation with this customer is in place.{state?.errors?.agreementConfirmed && <span className="field-error block">{state.errors.agreementConfirmed}</span>}</span>
        </label>
      </fieldset>
      <fieldset>
        <legend className="field-label">Milestones — choose the stages that match this project's actual scope</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {stages.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm"><input type="checkbox" name="stages" value={s} defaultChecked className="h-4 w-4 accent-emerald" /> {s}</label>
          ))}
        </div>
        <Area label="Extra milestones (one per line)" name="customStages" rows={2} state={state} className="mt-3" />
        {state?.errors?.stages && <p className="field-error">{state.errors.stages}</p>}
      </fieldset>
      <Area label="Budget allowances" name="budget" rows={4} state={state} hint="One per line: Category | amount, e.g. Structure | 1500000" />
      <Check label="Demonstration project (labelled as demo everywhere)" name="isDemo" />
      <Submit pending={pending}>Create BuildTrace project</Submit>
    </form>
  );
}

export function ProjectStatusForm({ id, status, contractorName, customerNote, managerId, managers, canAssign }: { id: string; status: string; contractorName: string; customerNote: string; managerId: string; managers: Opt[]; canAssign: boolean }) {
  const { state, onSubmit, pending } = useFormAction(updateBuildProject.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Select label="Project status" name="status" defaultValue={status} state={state}>
        {[["PLANNING", "Planning"], ["ACTIVE", "In progress"], ["ON_HOLD", "On hold"], ["HANDOVER", "Handover"], ["COMPLETED", "Completed (handed over)"], ["CANCELLED", "Cancelled"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <Field label="Contractor" name="contractorName" defaultValue={contractorName} state={state} />
      {canAssign ? (
        <Select label="Project manager" name="managerId" defaultValue={managerId} state={state}>
          <option value="">— Unassigned —</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
      ) : <input type="hidden" name="managerId" value={managerId} />}
      <Area label="Note to customer" name="customerNote" defaultValue={customerNote} rows={3} state={state} hint="Shown at the top of the customer's project page." />
      <Submit pending={pending}>Save project</Submit>
    </form>
  );
}

export type MilestoneValues = { id: string | null; name: string; status: string; plannedDate: string; completedDate: string; evidence: string; responsible: string; notes: string; issues: string; customerVisible: boolean };

export function MilestoneForm({ projectId, m }: { projectId: string; m: MilestoneValues }) {
  const { state, onSubmit, pending } = useFormAction(saveMilestone.bind(null, projectId, m.id));
  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-6">
      <Field label="Milestone" name="name" defaultValue={m.name} state={state} className="md:col-span-2" />
      <Select label="Status" name="status" defaultValue={m.status} state={state}>
        <option value="NOT_STARTED">Not started</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="REPORTED_COMPLETE">Reported complete</option>
        <option value="INSPECTED">Inspected</option>
        <option value="BLOCKED">Blocked</option>
      </Select>
      <Field label="Planned" name="plannedDate" type="date" defaultValue={m.plannedDate} state={state} />
      <Field label="Completed" name="completedDate" type="date" defaultValue={m.completedDate} state={state} />
      <Select label="Evidence" name="evidence" defaultValue={m.evidence} state={state}>
        <option value="">—</option>
        <option value="CONTRACTOR_REPORTED">Contractor-reported</option>
        <option value="STAFF_OBSERVED">Staff observed</option>
        <option value="INDEPENDENT_INSPECTION">Independent inspection</option>
        <option value="PROFESSIONAL_CERTIFICATE">Professional certificate</option>
      </Select>
      <Field label="Responsible" name="responsible" defaultValue={m.responsible} state={state} className="md:col-span-2" />
      <Field label="Inspection / review notes" name="notes" defaultValue={m.notes} state={state} className="md:col-span-2" />
      <Field label="Issues & dependencies" name="issues" defaultValue={m.issues} state={state} className="md:col-span-2" />
      <div className="flex flex-wrap items-center gap-4 md:col-span-6">
        <Check label="Visible to customer" name="customerVisible" defaultChecked={m.customerVisible} />
        <Submit variant={m.id ? "outline" : "primary"} pending={pending}>{m.id ? "Save milestone" : "Add milestone"}</Submit>
        {state && <span className={`text-sm ${state.ok ? "text-emerald" : "text-terracotta-deep"}`} role="status">{state.message}</span>}
      </div>
    </form>
  );
}

export function ProgressForm({ projectId, milestones }: { projectId: string; milestones: Opt[] }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      ref={ref}
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch(`/api/admin/buildtrace/${projectId}/updates`, { method: "POST", body: new FormData(e.currentTarget) }).catch(() => null);
        const body = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        if (res?.ok && body.ok) {
          setMsg({ ok: true, message: "Progress recorded." });
          ref.current?.reset();
          router.refresh();
        } else setMsg({ ok: false, message: body.message ?? "Could not save the update." });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Select label="Milestone" name="milestoneId" defaultValue="">
          <option value="">— General update —</option>
          {milestones.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
        <Select label="Reported by" name="source" defaultValue="CONTRACTOR_REPORTED" hint="Contractor claims are labelled differently from inspections.">
          <option value="CONTRACTOR_REPORTED">Contractor (reported)</option>
          <option value="STAFF_OBSERVED">V D Properties staff (observed)</option>
          <option value="INDEPENDENT_INSPECTION">Independent inspection</option>
          <option value="PROFESSIONAL_CERTIFICATE">Professional certificate</option>
        </Select>
      </div>
      <Area label="Progress note" name="body" rows={3} />
      <div>
        <label htmlFor="bt-photos" className="field-label">Progress photos (up to 8)</label>
        <input id="bt-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="field py-2 text-sm" />
        <p className="field-hint">Stored privately; GPS and camera metadata are removed.</p>
      </div>
      <Check label="Share with the customer" name="customerVisible" defaultChecked />
      <button className="btn btn-primary min-h-10 text-sm" disabled={busy}>{busy ? "Saving…" : "Record progress"}</button>
      {msg && <Status state={msg} />}
    </form>
  );
}

export function ProjectDocumentForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      ref={ref}
      className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await fetch(`/api/admin/buildtrace/${projectId}/files`, { method: "POST", body: new FormData(e.currentTarget) }).catch(() => null);
        const body = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        setMsg(res?.ok && body.ok ? { ok: true, message: "Document added." } : { ok: false, message: body.message ?? "Upload failed" });
        if (res?.ok) { ref.current?.reset(); router.refresh(); }
      }}
    >
      <Field label="Document title" name="title" />
      <div>
        <label htmlFor="bt-doc" className="field-label">PDF</label>
        <input id="bt-doc" name="file" type="file" accept="application/pdf" className="field py-2 text-sm" />
      </div>
      <button className="btn btn-primary min-h-11 text-sm" disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      <div className="md:col-span-3"><Check label="Share with the customer" name="customerVisible" /></div>
      {msg && <div className="md:col-span-3"><Status state={msg} /></div>}
    </form>
  );
}

export function BudgetLineForm({ projectId }: { projectId: string }) {
  const { state, onSubmit, pending } = useFormAction(addBudgetLine.bind(null, projectId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Category" name="category" state={state} />
      <Field label="Allowance (₹)" name="allowance" inputMode="numeric" state={state} />
      <Submit variant="outline" pending={pending}>Add allowance</Submit>
      {state?.ok && <span className="text-sm text-emerald">{state.message}</span>}
    </form>
  );
}

export function PaymentForm({ projectId, milestones }: { projectId: string; milestones: Opt[] }) {
  const { state, onSubmit, pending } = useFormAction(recordPayment.bind(null, projectId));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Status state={state} />
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Amount received (₹)" name="amount" inputMode="numeric" state={state} />
        <Field label="Received on" name="receivedOn" type="date" state={state} />
        <Field label="Receipt / bank reference" name="reference" state={state} />
        <Select label="Against milestone" name="milestoneId" defaultValue="">
          <option value="">—</option>
          {milestones.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
      </div>
      <Submit pending={pending}>Record payment</Submit>
    </form>
  );
}

export function ChangeRequestForm({ projectId }: { projectId: string }) {
  const { state, onSubmit, pending } = useFormAction(proposeChange.bind(null, projectId));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Status state={state} />
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Requested change" name="title" state={state} className="md:col-span-2" />
        <Field label="Cost impact (₹, − for savings)" name="costImpact" defaultValue="0" state={state} />
        <Field label="Schedule impact (days)" name="scheduleImpactDays" type="number" defaultValue="0" state={state} />
      </div>
      <Area label="Reason & supporting details" name="reason" rows={2} state={state} />
      <Submit variant="outline" pending={pending}>Propose change</Submit>
    </form>
  );
}

export function DecideChangeForm({ projectId, changeId }: { projectId: string; changeId: string }) {
  const approve = useFormAction(decideChange.bind(null, projectId, changeId, "APPROVED"));
  const reject = useFormAction(decideChange.bind(null, projectId, changeId, "REJECTED"));
  const state = approve.state ?? reject.state;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form onSubmit={approve.onSubmit} className="flex flex-wrap items-end gap-2">
          <input name="decisionNote" placeholder="Decision note (optional)" aria-label="Decision note" className="field min-h-9 py-1 text-sm" />
          <Submit pending={approve.pending} className="!min-h-9">Approve</Submit>
        </form>
        <form onSubmit={reject.onSubmit}>
          <Submit variant="danger" pending={reject.pending} className="!min-h-9">Reject</Submit>
        </form>
      </div>
      {state && <Status state={state} />}
    </div>
  );
}

export function ReplyForm({ projectId, questionId }: { projectId: string; questionId: string }) {
  const { state, onSubmit, pending } = useFormAction(replyQuestion.bind(null, projectId, questionId));
  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <Area label="Reply" name="reply" rows={2} state={state} className="min-w-[16rem] flex-1" />
      <Submit variant="outline" pending={pending}>Send reply</Submit>
    </form>
  );
}

export function HandoverAddForm({ projectId }: { projectId: string }) {
  const { state, onSubmit, pending } = useFormAction(addHandoverItem.bind(null, projectId));
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Add checklist item" name="label" state={state} />
      <Check label="Required" name="required" defaultChecked />
      <Submit variant="outline" pending={pending}>Add</Submit>
    </form>
  );
}
