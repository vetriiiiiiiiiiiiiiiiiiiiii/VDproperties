"use client";

import { useState } from "react";
import { createUser, updateUser } from "@/app/admin/_actions/users";
import { Field, Select, Status, Submit, useFormAction } from "./kit";

type Zone = { id: string; name: string };

const ROLE_HELP: Record<string, string> = {
  SUPER_ADMIN: "Super Admin — everything, including team and settings",
  ADMIN: "Admin — approves and publishes, manages zones and staff",
  STAFF: "Staff — listing drafts, leads, appointments, assigned projects",
  ZONAL_OFFICER: "Zonal Officer — properties, submissions and leads in their zones",
};

function RoleOptions({ roles }: { roles: string[] }) {
  return <>{roles.map((r) => <option key={r} value={r}>{ROLE_HELP[r]}</option>)}</>;
}

function ZonePicker({ zones, selected, show }: { zones: Zone[]; selected: string[]; show: boolean }) {
  if (!show) return null;
  if (!zones.length) return <p className="text-sm text-terracotta-deep md:col-span-2">Create a zone first (Zones in the menu), then assign it here.</p>;
  return (
    <fieldset className="md:col-span-2">
      <legend className="field-label">Zones covered</legend>
      <div className="flex flex-wrap gap-2">
        {zones.map((z) => (
          <label key={z.id} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm">
            <input type="checkbox" name="zoneIds" value={z.id} defaultChecked={selected.includes(z.id)} className="accent-emerald" /> {z.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateUserForm({ roles, zones }: { roles: string[]; zones: Zone[] }) {
  const { state, onSubmit, pending } = useFormAction(createUser);
  const [role, setRole] = useState(roles.includes("STAFF") ? "STAFF" : roles[0]);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" name="name" state={state} />
        <Field label="Email" name="email" type="email" state={state} />
        <Field label="Phone (optional)" name="phone" type="tel" state={state} />
        <Select label="Role" name="role" state={state} value={role} onChange={(e) => setRole(e.target.value)}><RoleOptions roles={roles} /></Select>
        <ZonePicker zones={zones} selected={[]} show={role === "ZONAL_OFFICER"} />
        <Field label="Temporary password" name="password" type="password" autoComplete="new-password" state={state} hint="12+ characters with upper- and lower-case letters and a number." />
      </div>
      <Submit pending={pending}>Add team member</Submit>
    </form>
  );
}

export function EditUserForm({ id, role, active, isSelf, roles, zones, zoneIds }: { id: string; role: string; active: boolean; isSelf: boolean; roles: string[]; zones: Zone[]; zoneIds: string[] }) {
  const { state, onSubmit, pending } = useFormAction(updateUser.bind(null, id));
  const [current, setCurrent] = useState(role);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
      <Select label="Role" name="role" value={current} onChange={(e) => setCurrent(e.target.value)} state={state} disabled={isSelf}>
        <RoleOptions roles={roles.includes(role) ? roles : [role, ...roles]} />
      </Select>
      {isSelf && <input type="hidden" name="role" value={role} />}
      <Field label="Reset password" name="password" type="password" autoComplete="new-password" placeholder="Leave blank to keep" state={state} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={active} disabled={isSelf} className="h-4 w-4 accent-emerald" /> Active
        {isSelf && <input type="hidden" name="active" value="on" />}
      </label>
      <Submit variant="outline" pending={pending}>Save</Submit>
      <div className="md:col-span-4"><ZonePicker zones={zones} selected={zoneIds} show={current === "ZONAL_OFFICER"} /></div>
      {state && <div className="md:col-span-4"><Status state={state} /></div>}
    </form>
  );
}
