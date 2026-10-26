"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Consent, FormStatus, Honeypot, NativeFallback, SelectField, SubmitButton, TextArea, TextField } from "./fields";
import { useLeadForm } from "./useLeadForm";

export type VisitOption = { value: string; label: string };

const SLOTS = ["MORNING", "MIDDAY", "AFTERNOON", "EVENING"] as const;

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SiteVisitForm({
  options,
  selected,
  closedWeekdays,
  blackoutDates,
  maxDays,
  businessName,
}: {
  options: { properties: VisitOption[]; projects: VisitOption[] };
  selected?: string;
  closedWeekdays: number[];
  blackoutDates: string[];
  maxDays: number;
  businessName?: string;
}) {
  const { t } = useI18n();
  const v = t.forms.visit;
  const { state, submit, err, reset, startedAt } = useLeadForm("/api/site-visits");
  const [subject, setSubject] = useState(selected ?? "");
  const [date, setDate] = useState("");
  const [localError, setLocalError] = useState<string>();

  const { min, max } = useMemo(() => {
    const t = new Date();
    const a = new Date(t);
    a.setDate(t.getDate() + 1);
    const b = new Date(t);
    b.setDate(t.getDate() + maxDays);
    return { min: iso(a), max: iso(b) };
  }, [maxDays]);

  const dayNames = v.days;

  function checkDate(v: string) {
    setDate(v);
    if (!v) return setLocalError(undefined);
    const day = new Date(`${v}T00:00:00`).getDay();
    if (closedWeekdays.includes(day)) return setLocalError(t.forms.visit.closedDay(dayNames[day]));
    if (blackoutDates.includes(v)) return setLocalError(t.forms.visit.blackout);
    setLocalError(undefined);
  }

  if (state.status === "success")
    return (
      <FormStatus
        state={state}
        onReset={reset}
        next={v.next}
      />
    );

  const [kind, id] = subject.split(":");
  const empty = options.properties.length === 0 && options.projects.length === 0;

  return (
    <form
      method="post"
      action="/api/site-visits"
      noValidate
      className="relative space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (localError) return;
        submit(e.currentTarget, { propertyId: kind === "p" ? id : undefined, projectId: kind === "j" ? id : undefined });
      }}
    >
      <Honeypot />
      <NativeFallback startedAt={startedAt} values={{}} />
      {selected && options.properties.concat(options.projects).some((o) => o.value === selected) ? (
        <input type="hidden" name="subject" value={selected} />
      ) : (
        <SelectField
          name="subject"
          label={v.subject}
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          error={err("propertyId")}
          hint={empty ? v.noneOpen : undefined}
        >
          <option value="">{v.choose}</option>
          {options.properties.length > 0 && (
            <optgroup label={v.properties}>
              {options.properties.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          )}
          {options.projects.length > 0 && (
            <optgroup label={v.projects}>
              {options.projects.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          )}
        </SelectField>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="preferredDate"
          label={v.date}
          type="date"
          required
          min={min}
          max={max}
          value={date}
          onChange={(e) => checkDate(e.target.value)}
          error={localError ?? err("preferredDate")}
          hint={closedWeekdays.length ? v.notAvailableOn(closedWeekdays.map((d) => dayNames[d]).join(", ")) : undefined}
        />
        <SelectField name="timeSlot" label={v.time} required defaultValue="" error={err("timeSlot")}>
          <option value="" disabled>{v.chooseTime}</option>
          {SLOTS.map((slot) => (
            <option key={slot} value={slot}>{t.labels.timeSlot[slot]}</option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label={t.forms.yourName} required autoComplete="name" error={err("name")} />
        <TextField name="phone" label={t.forms.phone} required type="tel" inputMode="tel" autoComplete="tel" error={err("phone")} />
      </div>
      <TextField name="email" label={t.forms.email} type="email" autoComplete="email" error={err("email")} />
      <TextArea name="message" label={v.anything} maxLength={1000} error={err("message")} />
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton state={state} label={v.submit} />
        <p className="text-xs text-slate">{v.footnote}</p>
      </div>
    </form>
  );
}
