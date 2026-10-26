"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/_actions/auth";
import { Status, Submit } from "./kit";

export function LoginForm() {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="space-y-5">
      <Status state={state} />
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <Submit className="w-full">Sign in</Submit>
    </form>
  );
}
