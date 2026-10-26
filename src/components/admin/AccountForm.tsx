"use client";

import { changeOwnPassword } from "@/app/admin/_actions/auth";
import { Field, Status, Submit, useFormAction } from "./kit";

export function AccountForm() {
  const { state, onSubmit, pending } = useFormAction(changeOwnPassword);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Status state={state} />
      <Field label="Current password" name="current" type="password" autoComplete="current-password" state={state} />
      <Field label="New password" name="next" type="password" autoComplete="new-password" state={state} hint="12+ characters with upper- and lower-case letters and a number." />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" state={state} />
      <Submit pending={pending}>Update password</Submit>
    </form>
  );
}
