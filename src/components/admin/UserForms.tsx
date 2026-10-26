"use client";

import { createUser, updateUser } from "@/app/admin/_actions/users";
import { Field, Select, Status, Submit, useFormAction } from "./kit";

const ROLE_OPTIONS = (
  <>
    <option value="PROPERTY_MANAGER">Property Manager — listings & projects</option>
    <option value="ENQUIRY_MANAGER">Enquiry Manager — leads & site visits</option>
    <option value="PROJECT_MANAGER">Project Manager — BuildTrace projects</option>
    <option value="SUPER_ADMIN">Super Admin — everything</option>
  </>
);

export function CreateUserForm() {
  const { state, onSubmit, pending } = useFormAction(createUser);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" name="name" state={state} />
        <Field label="Email" name="email" type="email" state={state} />
        <Select label="Role" name="role" state={state} defaultValue="ENQUIRY_MANAGER">{ROLE_OPTIONS}</Select>
        <Field label="Temporary password" name="password" type="password" autoComplete="new-password" state={state} hint="12+ characters with upper- and lower-case letters and a number." />
      </div>
      <Submit pending={pending}>Add team member</Submit>
    </form>
  );
}

export function EditUserForm({ id, role, active, isSelf }: { id: string; role: string; active: boolean; isSelf: boolean }) {
  const { state, onSubmit, pending } = useFormAction(updateUser.bind(null, id));
  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
      <Select label="Role" name="role" defaultValue={role} state={state} disabled={isSelf}>{ROLE_OPTIONS}</Select>
      {isSelf && <input type="hidden" name="role" value={role} />}
      <Field label="Reset password" name="password" type="password" autoComplete="new-password" placeholder="Leave blank to keep" state={state} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={active} disabled={isSelf} className="h-4 w-4 accent-emerald" /> Active
        {isSelf && <input type="hidden" name="active" value="on" />}
      </label>
      <Submit variant="outline" pending={pending}>Save</Submit>
      {state && <div className="md:col-span-4"><Status state={state} /></div>}
    </form>
  );
}
