"use client";

import Link from "@/i18n/Link";
import { useI18n } from "@/i18n/client";
import { useState, useTransition } from "react";
import { saveSearch } from "@/app/account/_actions/customer";
import type { Criteria } from "@/lib/plotfit";

export function SaveSearch({ criteria, signedIn, consent, next }: { criteria: Criteria; signedIn: boolean; consent: boolean; next: string }) {
  const { t } = useI18n();
  const sv = t.plotfit.save;
  const [name, setName] = useState(sv.defaultName);
  const [alerts, setAlerts] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (!signedIn)
    return (
      <p className="text-sm text-ivory/85">
        <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="font-semibold text-gold-light underline">{sv.signIn}</Link> {sv.signInTail}
      </p>
    );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="annot-plain text-gold-light">{sv.name}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="field mt-1 min-h-10 py-1.5" />
        </label>
        <button type="button" disabled={pending} className="btn btn-gold min-h-10" onClick={() => start(async () => { const r = await saveSearch(name, criteria, alerts); setMsg({ ok: r.ok, text: r.message }); })}>
          {pending ? sv.saving : sv.save}
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm text-ivory/85">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold" checked={alerts} disabled={!consent} onChange={(e) => setAlerts(e.target.checked)} />
        <span>{sv.alerts}{!consent && <>{sv.alertsConsentA}<Link href="/account#alerts" className="underline">{sv.alertsConsentLink}</Link>{sv.alertsConsentB}</>}.</span>
      </label>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-leaf" : "text-sun-light"}`}>{msg.text}</p>}
    </div>
  );
}
