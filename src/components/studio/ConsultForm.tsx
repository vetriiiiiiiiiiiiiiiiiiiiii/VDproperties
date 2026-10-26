"use client";

import { Consent, FormStatus, Honeypot, NativeFallback, SubmitButton, TextArea, TextField } from "@/components/forms/fields";
import { useLeadForm } from "@/components/forms/useLeadForm";

/** Sends the current Studio concept to the team as a construction enquiry. */
export function ConsultForm({ propertyId, summary, builtUp, plotArea, businessName }: { propertyId?: string; summary: string; builtUp: number; plotArea: number; businessName: string }) {
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/enquiries");
  if (state.status === "success")
    return <FormStatus state={state} onReset={reset} next="A member of our team will call you to arrange a consultation. Your concept summary is attached to the request." />;
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
      <h3 className="font-serif text-2xl text-navy">Request a professional consultation</h3>
      <p className="text-sm text-slate">We'll review your concept with you and explain what a professional design and site assessment would involve. Nothing is committed by sending this.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" error={err("name")} />
        <TextField name="phone" label="Phone number" required type="tel" autoComplete="tel" error={err("phone")} />
      </div>
      <TextField name="email" label="Email" type="email" autoComplete="email" error={err("email")} />
      <TextArea name="message" label="Concept summary" defaultValue={summary} maxLength={2000} error={err("message")} />
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <SubmitButton state={state} label="Request consultation" />
    </form>
  );
}
