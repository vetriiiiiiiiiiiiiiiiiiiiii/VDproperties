"use client";

import Link from "next/link";
import { useId } from "react";
import type { FormState } from "./useLeadForm";

type Common = { name: string; label: string; error?: string; hint?: string; required?: boolean; className?: string };

export function TextField({ name, label, error, hint, required, className = "", ...rest }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label} {required ? <span className="text-terracotta" aria-hidden="true">*</span> : <span className="font-normal text-slate">(optional)</span>}
      </label>
      <input id={id} name={name} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} className="field" {...rest} />
      {hint && !error && <p id={`${id}-h`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-e`} className="field-error">{error}</p>}
    </div>
  );
}

export function SelectField({ name, label, error, hint, required, className = "", children, ...rest }: Common & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label} {required ? <span className="text-terracotta" aria-hidden="true">*</span> : <span className="font-normal text-slate">(optional)</span>}
      </label>
      <select id={id} name={name} required={required} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} className="field" {...rest}>
        {children}
      </select>
      {hint && !error && <p id={`${id}-h`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-e`} className="field-error">{error}</p>}
    </div>
  );
}

export function TextArea({ name, label, error, required, className = "", ...rest }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label} {required ? <span className="text-terracotta" aria-hidden="true">*</span> : <span className="font-normal text-slate">(optional)</span>}
      </label>
      <textarea id={id} name={name} rows={4} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} className="field" {...rest} />
      {error && <p id={`${id}-e`} className="field-error">{error}</p>}
    </div>
  );
}

/**
 * Fields that let the form work as a plain POST before JavaScript loads, so personal details
 * are never sent in a URL. The JS path sends the same values as JSON.
 */
export function NativeFallback({ startedAt, values }: { startedAt: number; values: Record<string, string | undefined> }) {
  return (
    <>
      <input type="hidden" name="startedAt" defaultValue={startedAt} suppressHydrationWarning />
      {Object.entries(values).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </>
  );
}

/** Hidden from people and assistive tech; automated form-fillers tend to complete it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Leave this field empty
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function Consent({ error, businessName = "V D Properties" }: { error?: string; businessName?: string }) {
  const id = useId();
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-emerald" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} />
        <span>
          I agree that {businessName} may contact me about this request by phone, WhatsApp or email. My details won't be shared or used for anything else.{" "}
          <Link href="/privacy" className="underline">Privacy policy</Link>
        </span>
      </label>
      {error && <p id={`${id}-e`} className="field-error">{error}</p>}
    </div>
  );
}

export function FormStatus({ state, onReset, next }: { state: FormState; onReset: () => void; next: string }) {
  if (state.status === "success")
    return (
      <div role="status" className="border-l-4 border-emerald bg-white p-6">
        <p className="annot text-emerald">Received</p>
        <p className="mt-3 font-serif text-2xl text-navy">{state.message}</p>
        {state.reference && <p className="annot-plain mt-2 text-slate">Reference {state.reference}</p>}
        <p className="mt-3 text-slate">{next}</p>
        <button type="button" onClick={onReset} className="link-arrow mt-5 text-emerald">Send another request</button>
      </div>
    );
  if (state.status === "error")
    return (
      <div role="alert" className="border-l-4 border-terracotta bg-white p-4 text-sm text-terracotta-deep">
        {state.message}
      </div>
    );
  return null;
}

export function SubmitButton({ state, label }: { state: FormState; label: string }) {
  const busy = state.status === "submitting";
  return (
    <button type="submit" className="btn btn-primary w-full whitespace-nowrap sm:w-auto" disabled={busy} aria-busy={busy}>
      {busy ? "Sending…" : label}
    </button>
  );
}
