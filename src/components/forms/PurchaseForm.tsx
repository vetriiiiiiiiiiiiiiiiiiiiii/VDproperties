"use client";

import { useMemo } from "react";
import Link from "@/i18n/Link";
import { requestPurchase } from "@/app/account/_actions/purchases";
import { Area, Field, Select, Status, Submit, useFormAction } from "@/components/admin/kit";
import { useI18n } from "@/i18n/client";

export type Buyer = { signedIn: boolean; own: boolean; name: string; phone: string };

/** "Buy this property": an intent to buy plus a preferred appointment. Requires an account; nothing is paid online. */
export function PurchaseForm({ propertyId, buyer, maxDays, next }: { propertyId: string; buyer: Buyer; maxDays: number; next: string }) {
  const { t } = useI18n();
  const b = t.market.buy;
  const { state, onSubmit, pending } = useFormAction(requestPurchase.bind(null, propertyId));
  const [min, max] = useMemo(() => {
    const d = new Date();
    const a = new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10);
    const z = new Date(d.getTime() + maxDays * 86_400_000).toISOString().slice(0, 10);
    return [a, z];
  }, [maxDays]);

  if (!buyer.signedIn)
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate">{b.signIn}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="btn btn-primary">{t.market.sell.signIn}</Link>
          <Link href={`/account/register?next=${encodeURIComponent(next)}`} className="btn btn-outline text-navy">{t.market.sell.register}</Link>
        </div>
      </div>
    );
  if (buyer.own) return <p className="text-sm text-slate">{b.own}</p>;
  if (state?.ok)
    return (
      <div role="status" className="space-y-3">
        <p className="font-serif text-2xl text-navy">{state.message}</p>
        <p className="text-sm text-slate">{b.next}</p>
        <Link href="/account#purchases" className="link-arrow text-emerald">{t.market.purchases.title}</Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-slate">{b.intro}</p>
      <Status state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.forms.yourName} name="name" defaultValue={buyer.name} autoComplete="name" state={state} />
        <Field label={t.forms.phone} name="phone" type="tel" defaultValue={buyer.phone} autoComplete="tel" state={state} />
        <Field label={b.offer} name="offerAmount" type="number" min={0} step={10000} inputMode="numeric" hint={b.offerHint} state={state} />
        <Select label={b.funding} name="funding" defaultValue="UNDECIDED" state={state}>
          {Object.entries(b.fundings).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Select label={b.timeline} name="timeline" defaultValue="" state={state}>
          <option value="">{t.forms.visit.choose}</option>
          {b.timelines.map((l) => <option key={l}>{l}</option>)}
        </Select>
        <Select label={b.mode} name="mode" defaultValue="SITE_VISIT" state={state}>
          {Object.entries(b.modes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <Field label={b.date} name="preferredDate" type="date" min={min} max={max} state={state} />
        <Select label={b.time} name="timeSlot" defaultValue="MORNING" state={state}>
          {(["MORNING", "MIDDAY", "AFTERNOON", "EVENING"] as const).map((k) => <option key={k} value={k}>{t.labels.timeSlot[k]}</option>)}
        </Select>
      </div>
      <Area label={b.message} name="message" rows={3} maxLength={1000} state={state} />
      <label className="flex items-start gap-3 text-sm text-slate">
        <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-emerald" aria-invalid={state?.errors?.consent ? true : undefined} />
        <span>
          {t.forms.consent("V D Properties")}
          {state?.errors?.consent && <span className="field-error block">{state.errors.consent}</span>}
        </span>
      </label>
      <Submit pending={pending} className="w-full sm:w-auto">{b.submit}</Submit>
      <p className="text-xs text-slate">{b.footnote}</p>
    </form>
  );
}
