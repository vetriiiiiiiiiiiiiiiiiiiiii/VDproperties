"use client";

import { useMemo, useState } from "react";
import { Consent, FormStatus, Honeypot, NativeFallback, SelectField, SubmitButton, TextArea, TextField } from "./fields";
import { useLeadForm } from "./useLeadForm";

export type VisitOption = { value: string; label: string };

const SLOTS = [
  ["MORNING", "Morning · 9–11 am"],
  ["MIDDAY", "Midday · 11 am–1 pm"],
  ["AFTERNOON", "Afternoon · 2–4 pm"],
  ["EVENING", "Evening · 4–6 pm"],
] as const;

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

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function checkDate(v: string) {
    setDate(v);
    if (!v) return setLocalError(undefined);
    const day = new Date(`${v}T00:00:00`).getDay();
    if (closedWeekdays.includes(day)) return setLocalError(`Site visits aren't available on ${dayNames[day]}s. Please choose another date.`);
    if (blackoutDates.includes(v)) return setLocalError("Site visits aren't available on this date. Please choose another.");
    setLocalError(undefined);
  }

  if (state.status === "success")
    return (
      <FormStatus
        state={state}
        onReset={reset}
        next="This is a request, not a confirmed appointment. Our team will call you to agree a time that works, and the visit is only booked once we've confirmed it with you."
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
          label="Property or project to visit"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          error={err("propertyId")}
          hint={empty ? "There are no listings open for visits right now. Send us an enquiry instead." : undefined}
        >
          <option value="">Choose…</option>
          {options.properties.length > 0 && (
            <optgroup label="Properties">
              {options.properties.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          )}
          {options.projects.length > 0 && (
            <optgroup label="Projects">
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
          label="Preferred date"
          type="date"
          required
          min={min}
          max={max}
          value={date}
          onChange={(e) => checkDate(e.target.value)}
          error={localError ?? err("preferredDate")}
          hint={closedWeekdays.length ? `Not available on ${closedWeekdays.map((d) => dayNames[d]).join(", ")}` : undefined}
        />
        <SelectField name="timeSlot" label="Preferred time" required defaultValue="" error={err("timeSlot")}>
          <option value="" disabled>Choose a time range</option>
          {SLOTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" error={err("name")} />
        <TextField name="phone" label="Phone number" required type="tel" inputMode="tel" autoComplete="tel" error={err("phone")} />
      </div>
      <TextField name="email" label="Email" type="email" autoComplete="email" error={err("email")} />
      <TextArea name="message" label="Anything we should know?" maxLength={1000} error={err("message")} />
      <Consent error={err("consent")} businessName={businessName} />
      <FormStatus state={state} onReset={reset} next="" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SubmitButton state={state} label="Request site visit" />
        <p className="text-xs text-slate">A request is confirmed only when our team calls you back.</p>
      </div>
    </form>
  );
}
