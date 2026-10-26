"use client";

import { Consent, FormStatus, Honeypot, NativeFallback, SelectField, SubmitButton, TextArea, TextField } from "./fields";
import { useLeadForm } from "./useLeadForm";

export const BUDGET_RANGES = ["Under ₹25 lakh", "₹25–50 lakh", "₹50 lakh–₹1 crore", "₹1–2 crore", "Above ₹2 crore", "Not sure yet"];
export const START_TIMEFRAMES = ["Within 3 months", "3–6 months", "6–12 months", "More than a year", "Just exploring"];

export function ConstructionForm({ businessName }: { businessName?: string }) {
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/enquiries");

  if (state.status === "success")
    return <FormStatus state={state} onReset={reset} next="Our team will review your requirements and call you to talk them through. Nothing is committed until you've discussed and agreed the details with us." />;

  return (
    <form
      method="post"
      action="/api/enquiries"
      noValidate
      className="relative space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget, { type: "CONSTRUCTION" });
      }}
    >
      <Honeypot />
      <NativeFallback startedAt={startedAt} values={{ type: "CONSTRUCTION" }} />
      <fieldset className="space-y-5">
        <legend className="annot text-emerald">About the site</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="siteLocation" label="Plot location" placeholder="Area, town or city" error={err("siteLocation")} />
          <SelectField name="hasLand" label="Do you already own the land?" defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="yes">Yes, I have a plot</option>
            <option value="no">No, I need help finding one</option>
          </SelectField>
          <TextField name="plotAreaSqft" label="Approximate plot area (sq ft)" type="number" inputMode="numeric" min={1} error={err("plotAreaSqft")} />
          <TextField name="houseSizeSqft" label="Preferred house size (sq ft)" type="number" inputMode="numeric" min={1} error={err("houseSizeSqft")} />
          <SelectField name="budgetRange" label="Expected budget" defaultValue="" error={err("budgetRange")}>
            <option value="">Choose a range</option>
            {BUDGET_RANGES.map((b) => <option key={b}>{b}</option>)}
          </SelectField>
          <SelectField name="startTimeframe" label="When would you like to start?" defaultValue="" error={err("startTimeframe")}>
            <option value="">Choose…</option>
            {START_TIMEFRAMES.map((b) => <option key={b}>{b}</option>)}
          </SelectField>
        </div>
      </fieldset>
      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="annot text-emerald">Your details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="name" label="Your name" required autoComplete="name" error={err("name")} />
          <TextField name="phone" label="Phone number" required type="tel" inputMode="tel" autoComplete="tel" error={err("phone")} />
        </div>
        <TextField name="email" label="Email" type="email" autoComplete="email" error={err("email")} />
        <TextArea name="message" label="Tell us about the home you have in mind" maxLength={2000} error={err("message")} />
      </fieldset>
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <SubmitButton state={state} label="Send construction enquiry" />
    </form>
  );
}
