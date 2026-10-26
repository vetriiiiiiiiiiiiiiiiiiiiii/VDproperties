"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginCustomer, registerCustomer, updateAlertConsent } from "@/app/account/_actions/auth";
import { Field, Status, Submit } from "@/components/admin/kit";

export function CustomerLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginCustomer, null);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="username" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Submit className="w-full">Sign in</Submit>
      <p className="text-sm text-slate">New here? <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="underline">Create an account</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerCustomer, null);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Your name" name="name" autoComplete="name" state={state} required />
      <Field label="Email" name="email" type="email" autoComplete="email" state={state} required />
      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" state={state} required />
      <Field label="Password" name="password" type="password" autoComplete="new-password" state={state} hint="12+ characters with upper- and lower-case letters and a number." required />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span>I agree to the <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.{state?.errors?.terms && <span className="field-error block">{state.errors.terms}</span>}</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate">
        <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span>Email me about new listings that match my saved searches (optional — change any time).</span>
      </label>
      <Submit className="w-full">Create account</Submit>
      <p className="text-sm text-slate">Already registered? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="underline">Sign in</Link></p>
    </form>
  );
}

export function AlertConsentForm({ consent }: { consent: boolean }) {
  const [state, action] = useActionState(updateAlertConsent, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3" id="alerts">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="marketing" defaultChecked={consent} className="h-4 w-4 accent-emerald" /> Email me about new listings matching saved searches
      </label>
      <Submit variant="outline">Save preference</Submit>
      {state && <span className="text-sm text-slate" role="status">{state.message}</span>}
    </form>
  );
}
