"use client";

import { useActionState, useTransition, useState } from "react";
import Link from "@/i18n/Link";
import { confirmEmail, requestPasswordReset, resendVerification, resetPassword } from "@/app/account/_actions/recovery";
import { Field, Status, Submit } from "@/components/admin/kit";
import { useI18n } from "@/i18n/client";

export function ForgotForm() {
  const { t } = useI18n();
  const a = t.market.auth;
  const [state, action] = useActionState(requestPasswordReset, null);
  if (state?.ok) return <p role="status" className="text-sm text-ink">{state.message}</p>;
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <Field label={t.account.auth.email} name="email" type="email" autoComplete="username" required />
      <Submit className="w-full">{a.sendLink}</Submit>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const a = t.market.auth;
  const [state, action] = useActionState(resetPassword.bind(null, token), null);
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <Field label={a.newPassword} name="password" type="password" autoComplete="new-password" hint={t.account.auth.passwordHint} state={state} required />
      <Submit className="w-full">{a.setPassword}</Submit>
    </form>
  );
}

export function ConfirmEmailForm({ token }: { token: string }) {
  const { t } = useI18n();
  const a = t.market.auth;
  const [state, action] = useActionState(confirmEmail.bind(null, token), null);
  if (state?.ok)
    return (
      <div role="status" className="space-y-4">
        <p className="text-ink">{state.message}</p>
        <Link href="/account" className="btn btn-primary">{a.goAccount}</Link>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <Status state={state} />
      <Submit className="w-full">{a.verifyButton}</Submit>
    </form>
  );
}

export function VerifyBanner({ email }: { email: string }) {
  const { t } = useI18n();
  const a = t.market.auth;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="border-l-4 border-gold bg-white p-4 text-sm">
      <p className="font-semibold text-ink">{a.bannerTitle}</p>
      <p className="mt-1 text-slate">{a.banner(email)}</p>
      <button type="button" disabled={pending} className="mt-2 underline" onClick={() => start(async () => setMsg((await resendVerification()).message))}>{a.resend}</button>
      {msg && <p role="status" className="mt-1 text-xs text-slate">{msg}</p>}
    </div>
  );
}
