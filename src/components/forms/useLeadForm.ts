"use client";

import { useRef, useState } from "react";

export type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string; reference?: string }
  | { status: "error"; message: string; errors: Record<string, string> };

/** Posts a form as JSON. Only reports success when the server confirms the record was stored. */
export function useLeadForm(endpoint: string) {
  const [state, setState] = useState<FormState>({ status: "idle" });
  const startedAt = useRef<number>(Date.now());
  const inFlight = useRef(false);

  async function submit(form: HTMLFormElement, extra: Record<string, unknown> = {}) {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ status: "submitting" });
    const data: Record<string, unknown> = Object.fromEntries(new FormData(form).entries());
    // Unchecked checkboxes are absent from FormData; send them explicitly.
    form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => (data[cb.name] = cb.checked));
    Object.assign(data, extra, { startedAt: startedAt.current, sourcePath: window.location.pathname });
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setState({ status: "success", message: body.message, reference: body.reference });
        form.reset();
      } else {
        setState({
          status: "error",
          message: body?.message ?? "We couldn't send your request. Please try again in a moment.",
          errors: body?.errors ?? {},
        });
        const firstInvalid = body?.errors && Object.keys(body.errors)[0];
        if (firstInvalid) form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      }
    } catch {
      setState({ status: "error", message: "We couldn't reach the server. Check your connection and try again — your request has not been sent.", errors: {} });
    } finally {
      inFlight.current = false;
    }
  }

  const err = (name: string) => (state.status === "error" ? state.errors[name] : undefined);
  const reset = () => {
    startedAt.current = Date.now();
    setState({ status: "idle" });
  };
  return { state, submit, err, reset, startedAt: startedAt.current };
}
