"use client";

import Link from "@/i18n/Link";
import { useI18n } from "@/i18n/client";
import { useActionState } from "react";
import { loginCustomer, registerCustomer, updateAlertConsent } from "@/app/account/_actions/auth";
import { Field, Status, Submit } from "@/components/admin/kit";

export function CustomerLoginForm({ next }: { next: string }) {
  const { t } = useI18n();
  const a = t.account.auth;
  const [state, action] = useActionState(loginCustomer, null);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label={a.email} name="email" type="email" autoComplete="username" required />
      <Field label={a.password} name="password" type="password" autoComplete="current-password" required />
      <Submit className="w-full">{a.signIn}</Submit>
      <p className="text-sm text-slate">{a.newHere} <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="underline">{a.createLink}</Link></p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { t } = useI18n();
  const a = t.account.auth;
  const [state, action] = useActionState(registerCustomer, null);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label={a.name} name="name" autoComplete="name" state={state} required />
      <Field label={a.email} name="email" type="email" autoComplete="email" state={state} required />
      <Field label={a.phone} name="phone" type="tel" autoComplete="tel" state={state} required />
      <Field label={a.password} name="password" type="password" autoComplete="new-password" state={state} hint={a.passwordHint} required />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span>{a.termsA} <Link href="/terms" className="underline">{a.terms}</Link> {a.and} <Link href="/privacy" className="underline">{a.privacy}</Link>.{state?.errors?.terms && <span className="field-error block">{state.errors.terms}</span>}</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-slate">
        <input type="checkbox" name="marketing" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span>{a.marketing}</span>
      </label>
      <Submit className="w-full">{a.create}</Submit>
      <p className="text-sm text-slate">{a.already} <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="underline">{a.signInLink}</Link></p>
    </form>
  );
}

export function AlertConsentForm({ consent }: { consent: boolean }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateAlertConsent, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3" id="alerts">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="marketing" defaultChecked={consent} className="h-4 w-4 accent-emerald" /> {t.account.auth.alerts}
      </label>
      <Submit variant="outline">{t.account.auth.savePref}</Submit>
      {state && <span className="text-sm text-slate" role="status">{state.message}</span>}
    </form>
  );
}
