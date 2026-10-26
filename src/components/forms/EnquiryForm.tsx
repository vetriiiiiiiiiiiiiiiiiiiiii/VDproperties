"use client";

import { useState } from "react";
import { Consent, FormStatus, Honeypot, NativeFallback, SubmitButton, TextArea, TextField } from "./fields";
import { useLeadForm } from "./useLeadForm";

type EnquiryKind = "GENERAL" | "PROPERTY" | "PLOT" | "HOUSE" | "PROJECT";

const CHOICES: { value: EnquiryKind; label: string }[] = [
  { value: "GENERAL", label: "Help me find a property" },
  { value: "PLOT", label: "Enquire about a plot" },
  { value: "HOUSE", label: "Discuss a house" },
];

export function EnquiryForm({
  propertyId,
  propertyLabel,
  projectId,
  defaultType = "GENERAL",
  chooseType = false,
  submitLabel = "Send enquiry",
  businessName,
}: {
  propertyId?: string;
  propertyLabel?: string;
  projectId?: string;
  defaultType?: EnquiryKind;
  chooseType?: boolean;
  submitLabel?: string;
  businessName?: string;
}) {
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/enquiries");
  const [type, setType] = useState<EnquiryKind>(propertyId ? "PROPERTY" : projectId ? "PROJECT" : defaultType);

  if (state.status === "success")
    return <FormStatus state={state} onReset={reset} next="Our team will call you on the number you gave us. This form doesn't book an appointment by itself." />;

  return (
    <form
      method="post"
      action="/api/enquiries"
      noValidate
      className="relative space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget, { type, propertyId, projectId });
      }}
    >
      <Honeypot />
      <NativeFallback startedAt={startedAt} values={{ type, propertyId, projectId }} />
      {propertyLabel && (
        <p className="border border-dashed border-line bg-ivory px-3 py-2 text-sm text-slate">
          About: <strong className="text-ink">{propertyLabel}</strong>
        </p>
      )}
      {chooseType && (
        <fieldset>
          <legend className="field-label">What can we help with?</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {CHOICES.map((c) => (
              <label key={c.value} className={`flex cursor-pointer items-center gap-2 border px-3 py-3 text-sm ${type === c.value ? "border-emerald bg-white text-ink" : "border-line text-slate"}`}>
                <input type="radio" name="typeChoice" value={c.value} checked={type === c.value} onChange={() => setType(c.value)} className="accent-emerald" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" error={err("name")} />
        <TextField name="phone" label="Phone number" required type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" error={err("phone")} />
      </div>
      <TextField name="email" label="Email" type="email" autoComplete="email" error={err("email")} />
      <TextArea
        name="message"
        label="Message"
        placeholder={type === "PLOT" ? "Preferred area, plot size, budget…" : type === "HOUSE" ? "Bedrooms, area, budget, when you'd like to move…" : "Tell us what you're looking for"}
        maxLength={2000}
        error={err("message")}
      />
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton state={state} label={submitLabel} />
        <p className="text-xs text-slate">We reply by phone. Your details are stored securely and used only to respond.</p>
      </div>
    </form>
  );
}
