"use client";

import { useI18n } from "@/i18n/client";
import { Consent, FormStatus, Honeypot, NativeFallback, SubmitButton, TextArea, TextField } from "@/components/forms/fields";
import { useLeadForm } from "@/components/forms/useLeadForm";

/** Sends the current Studio concept to the team as a construction enquiry. */
export function ConsultForm({ propertyId, summary, builtUp, plotArea, businessName }: { propertyId?: string; summary: string; builtUp: number; plotArea: number; businessName: string }) {
  const { t } = useI18n();
  const c = t.studio.consult;
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/enquiries");
  if (state.status === "success") return <FormStatus state={state} onReset={reset} next={c.next} />;
  return (
    <form
      method="post"
      action="/api/enquiries"
      noValidate
      className="relative space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget, { type: "CONSTRUCTION", propertyId, houseSizeSqft: builtUp, plotAreaSqft: plotArea });
      }}
    >
      <Honeypot />
      <NativeFallback startedAt={startedAt} values={{ type: "CONSTRUCTION", propertyId }} />
      <h3 className="font-serif text-2xl text-navy">{c.title}</h3>
      <p className="text-sm text-slate">{c.body}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label={t.forms.yourName} required autoComplete="name" error={err("name")} />
        <TextField name="phone" label={t.forms.phone} required type="tel" autoComplete="tel" error={err("phone")} />
      </div>
      <TextField name="email" label={t.forms.email} type="email" autoComplete="email" error={err("email")} />
      <TextArea name="message" label={c.summary} defaultValue={summary} maxLength={2000} error={err("message")} />
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <SubmitButton state={state} label={c.submit} />
    </form>
  );
}
