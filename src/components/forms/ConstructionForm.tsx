"use client";

import { useI18n } from "@/i18n/client";
import { Consent, FormStatus, Honeypot, NativeFallback, SelectField, SubmitButton, TextArea, TextField } from "./fields";
import { useLeadForm } from "./useLeadForm";


export function ConstructionForm({ businessName }: { businessName?: string }) {
  const { t } = useI18n();
  const c = t.forms.construction;
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/enquiries");

  if (state.status === "success")
    return <FormStatus state={state} onReset={reset} next={c.next} />;

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
        <legend className="annot text-emerald">{c.aboutSite}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="siteLocation" label={c.siteLocation} placeholder={c.siteLocationPlaceholder} error={err("siteLocation")} />
          <SelectField name="hasLand" label={c.ownLand} defaultValue="">
            <option value="">{c.preferNot}</option>
            <option value="yes">{c.haveLand}</option>
            <option value="no">{c.needLand}</option>
          </SelectField>
          <TextField name="plotAreaSqft" label={c.plotArea} type="number" inputMode="numeric" min={1} error={err("plotAreaSqft")} />
          <TextField name="houseSizeSqft" label={c.houseSize} type="number" inputMode="numeric" min={1} error={err("houseSizeSqft")} />
          <SelectField name="budgetRange" label={c.budget} defaultValue="" error={err("budgetRange")}>
            <option value="">{c.chooseRange}</option>
            {c.budgets.map((b) => <option key={b}>{b}</option>)}
          </SelectField>
          <SelectField name="startTimeframe" label={c.start} defaultValue="" error={err("startTimeframe")}>
            <option value="">{t.forms.visit.choose}</option>
            {c.timeframes.map((b) => <option key={b}>{b}</option>)}
          </SelectField>
        </div>
      </fieldset>
      <fieldset className="space-y-5 border-t border-line pt-6">
        <legend className="annot text-emerald">{c.yourDetails}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="name" label={t.forms.yourName} required autoComplete="name" error={err("name")} />
          <TextField name="phone" label={t.forms.phone} required type="tel" inputMode="tel" autoComplete="tel" error={err("phone")} />
        </div>
        <TextField name="email" label={t.forms.email} type="email" autoComplete="email" error={err("email")} />
        <TextArea name="message" label={c.tellUs} maxLength={2000} error={err("message")} />
      </fieldset>
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <SubmitButton state={state} label={c.submit} />
    </form>
  );
}
