"use client";

import { startTransition, useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/admin";

export function Status({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <div role={state.ok ? "status" : "alert"} className={`border-l-4 px-4 py-3 text-sm ${state.ok ? "border-emerald bg-emerald/5 text-forest" : "border-terracotta bg-terracotta/5 text-terracotta-deep"}`}>
      {state.message}
    </div>
  );
}

/**
 * Like useActionState, but submits via onSubmit so React doesn't reset the form afterwards —
 * people keep what they typed when validation fails. Includes the clicked button's name/value.
 */
export function useFormAction(fn: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>) {
  const [state, action, pending] = useActionState(fn, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => action(fd));
  };
  return { state, onSubmit, pending };
}

export function Submit({ children, name, value, variant = "primary", className = "", pending: forced }: { children: React.ReactNode; name?: string; value?: string; variant?: "primary" | "outline" | "gold" | "danger"; className?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = forced ?? status.pending;
  const styles = { primary: "btn-primary", outline: "btn-outline text-navy", gold: "btn-gold", danger: "btn-outline text-terracotta-deep" }[variant];
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={`btn ${styles} min-h-10 py-2 text-sm ${className}`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

type FieldProps = {
  label: string;
  name: string;
  state?: ActionResult | null;
  hint?: string;
  className?: string;
};

export function Field({ label, name, state, hint, className = "", ...rest }: FieldProps & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const error = state?.errors?.[name];
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} name={name} className="field" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-d` : undefined} {...rest} />
      {(error || hint) && <p id={`${id}-d`} className={error ? "field-error" : "field-hint"}>{error ?? hint}</p>}
    </div>
  );
}

export function Area({ label, name, state, hint, className = "", ...rest }: FieldProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const error = state?.errors?.[name];
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea id={id} name={name} rows={4} className="field" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-d` : undefined} {...rest} />
      {(error || hint) && <p id={`${id}-d`} className={error ? "field-error" : "field-hint"}>{error ?? hint}</p>}
    </div>
  );
}

export function Select({ label, name, state, hint, className = "", children, ...rest }: FieldProps & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const error = state?.errors?.[name];
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <select id={id} name={name} className="field" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-d` : undefined} {...rest}>
        {children}
      </select>
      {(error || hint) && <p id={`${id}-d`} className={error ? "field-error" : "field-hint"}>{error ?? hint}</p>}
    </div>
  );
}

export function Check({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-emerald" />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {hint && <span className="block text-slate">{hint}</span>}
      </span>
    </label>
  );
}

export function Panel({ title, children, actions, description }: { title: string; children: React.ReactNode; actions?: React.ReactNode; description?: string }) {
  return (
    <section className="border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-ink" style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}>{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
