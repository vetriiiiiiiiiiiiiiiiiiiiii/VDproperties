"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { Consent, FormStatus, Honeypot, NativeFallback, SubmitButton, TextArea, TextField } from "./fields";
import { useLeadForm } from "./useLeadForm";

type EnquiryKind = "GENERAL" | "PROPERTY" | "PLOT" | "HOUSE" | "PROJECT";

export function EnquiryForm({
  propertyId,
  propertyLabel,
  projectId,
  defaultType = "GENERAL",
  chooseType = false,
  submitLabel,
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
  const { t } = useI18n();
  const e = t.forms.enquiry;
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/enquiries");
  const [type, setType] = useState<EnquiryKind>(propertyId ? "PROPERTY" : projectId ? "PROJECT" : defaultType);
  const choices: { value: EnquiryKind; label: string }[] = [
    { value: "GENERAL", label: e.findProperty },
    { value: "PLOT", label: e.plot },
    { value: "HOUSE", label: e.house },
  ];

  if (state.status === "success") return <FormStatus state={state} onReset={reset} next={e.next} />;

  return (
    <form
      method="post"
      action="/api/enquiries"
      noValidate
      className="relative space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        submit(ev.currentTarget, { type, propertyId, projectId });
      }}
    >
      <Honeypot />
      <NativeFallback startedAt={startedAt} values={{ type, propertyId, projectId }} />
      {propertyLabel && (
        <p className="rounded-2xl bg-paper px-4 py-2.5 text-sm text-slate">
          {e.about} <strong className="text-ink">{propertyLabel}</strong>
        </p>
      )}
      {chooseType && (
        <fieldset>
          <legend className="field-label">{e.helpWith}</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-3">
            {choices.map((c) => (
              <label key={c.value} className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-all duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${type === c.value ? "border-emerald bg-emerald/8 text-ink shadow-[0_8px_24px_-16px_rgba(44,122,30,0.8)]" : "border-line bg-white/70 text-slate hover:border-emerald/50"}`}>
                <input type="radio" name="typeChoice" value={c.value} checked={type === c.value} onChange={() => setType(c.value)} className="accent-emerald" />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label={t.forms.yourName} required autoComplete="name" error={err("name")} />
        <TextField name="phone" label={t.forms.phone} required type="tel" inputMode="tel" autoComplete="tel" placeholder={t.forms.phonePlaceholder} error={err("phone")} />
      </div>
      <TextField name="email" label={t.forms.email} type="email" autoComplete="email" error={err("email")} />
      <TextArea name="message" label={t.forms.message} placeholder={type === "PLOT" ? e.placeholderPlot : type === "HOUSE" ? e.placeholderHouse : e.placeholderGeneral} maxLength={2000} error={err("message")} />
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton state={state} label={submitLabel ?? e.submit} />
        <p className="text-xs text-slate">{e.footnote}</p>
      </div>
    </form>
  );
}
