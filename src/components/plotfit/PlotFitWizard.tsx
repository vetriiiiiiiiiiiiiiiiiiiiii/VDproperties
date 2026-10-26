"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { criteriaToQuery, FACILITY_KINDS, type Criteria } from "@/lib/plotfit";

type Location = { slug: string; name: string };

const EMPTY: Criteria = {
  budget: undefined, reservePct: undefined, locations: [], strictLocation: false, type: "either", timeline: "unsure", bedrooms: undefined,
  builtUp: undefined, parking: false, garden: false, office: false, facilities: [], maxKm: undefined, includeUnavailable: false,
};

export function PlotFitWizard({ locations, initial }: { locations: Location[]; initial?: Partial<Criteria> }) {
  const router = useRouter();
  const { t, f, href } = useI18n();
  const w = t.plotfit.wizard;
  const q = w.q;
  const [c, setC] = useState<Criteria>({ ...EMPTY, ...initial });
  const [step, setStep] = useState(0);
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setC((x) => ({ ...x, [k]: v }));

  const split = q.split(f.price((c.budget ?? 0) * ((c.reservePct ?? 0) / 100)), f.price((c.budget ?? 0) * (1 - (c.reservePct ?? 0) / 100)));
  const steps: { title: string; hint: string; essential?: boolean; body: React.ReactNode }[] = [
    {
      ...q.budget,
      body: (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[2500000, 5000000, 10000000, 20000000].map((v) => (
              <Tile key={v} selected={c.budget === v} onClick={() => set("budget", v)}>{f.price(v)}</Tile>
            ))}
          </div>
          <label className="block text-sm">
            {q.enterAmount}
            <input type="number" min={0} step={100000} value={c.budget ?? ""} onChange={(e) => set("budget", e.target.value ? Number(e.target.value) : undefined)} className="field mt-1" />
          </label>
        </div>
      ),
    },
    {
      ...q.locations,
      body: (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {locations.map((l) => (
              <Tile key={l.slug} selected={c.locations.includes(l.slug)} onClick={() => set("locations", c.locations.includes(l.slug) ? c.locations.filter((x) => x !== l.slug) : [...c.locations, l.slug])}>{l.name}</Tile>
            ))}
          </div>
          {locations.length === 0 && <p className="text-sm text-slate">{q.noLocations}</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-emerald" checked={c.strictLocation} onChange={(e) => set("strictLocation", e.target.checked)} /> {q.strict}</label>
        </div>
      ),
    },
    {
      ...q.type,
      essential: true,
      body: (
        <div className="grid gap-2 sm:grid-cols-3">
          {(["land", "home", "either"] as const).map((v) => [v, ...q.types[v]] as const).map(([v, l, d]) => (
            <Tile key={v} selected={c.type === v} onClick={() => set("type", v)}><span className="block font-serif text-2xl">{l}</span><span className="text-sm opacity-75">{d}</span></Tile>
          ))}
        </div>
      ),
    },
    {
      ...q.timeline,
      body: (
        <div className="grid gap-2 sm:grid-cols-3">
          {(["now", "later", "unsure"] as const).map((v) => [v, q.timelines[v]] as const).map(([v, l]) => (
            <Tile key={v} selected={c.timeline === v} onClick={() => set("timeline", v)}>{l}</Tile>
          ))}
        </div>
      ),
    },
    {
      ...q.bedrooms,
      body: (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((n) => <Tile key={n} selected={c.bedrooms === n} onClick={() => set("bedrooms", n)}>{n}{n === 6 ? "+" : ""}</Tile>)}
        </div>
      ),
    },
    {
      ...q.size,
      body: (
        <div className="space-y-3">
          <p className="font-serif text-4xl text-navy">{c.builtUp ? f.area(c.builtUp) : q.noPreference}</p>
          <input type="range" min={600} max={5000} step={100} value={c.builtUp ?? 1600} onChange={(e) => set("builtUp", Number(e.target.value))} className="w-full accent-emerald" aria-label={q.sizeLabel} />
          {c.builtUp && <button type="button" onClick={() => set("builtUp", undefined)} className="text-sm underline">{q.clear}</button>}
        </div>
      ),
    },
    {
      ...q.needs,
      body: (
        <div className="grid gap-2 sm:grid-cols-3">
          <Tile selected={c.parking} onClick={() => set("parking", !c.parking)}>{q.needOpts.parking}</Tile>
          <Tile selected={c.garden} onClick={() => set("garden", !c.garden)}>{q.needOpts.garden}</Tile>
          <Tile selected={c.office} onClick={() => set("office", !c.office)}>{q.needOpts.office}</Tile>
        </div>
      ),
    },
    {
      ...q.near,
      body: (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.keys(FACILITY_KINDS).map((k) => [k, t.twin.facilities[k]] as const).map(([k, l]) => (
              <Tile key={k} selected={c.facilities.includes(k)} onClick={() => set("facilities", c.facilities.includes(k) ? c.facilities.filter((x) => x !== k) : [...c.facilities, k])}>{l}</Tile>
            ))}
          </div>
          <label className="block text-sm">
            {q.within(c.maxKm ?? 5)}
            <input type="range" min={1} max={25} value={c.maxKm ?? 5} onChange={(e) => set("maxKm", Number(e.target.value))} className="w-full accent-emerald" aria-label={q.within(c.maxKm ?? 5)} />
          </label>
        </div>
      ),
    },
    {
      ...q.reserve,
      body: (
        <div className="space-y-3">
          <p className="font-serif text-4xl text-navy">{q.kept(c.reservePct ?? 0)}</p>
          <input type="range" min={0} max={80} step={5} value={c.reservePct ?? 0} onChange={(e) => set("reservePct", Number(e.target.value))} className="w-full accent-emerald" aria-label={q.reserveLabel} />
          {c.budget ? (
            <p className="text-slate">
              {split[0]}<strong className="text-ink">{split[1]}</strong>{split[2]}
            </p>
          ) : (
            <p className="text-slate">{q.addBudget}</p>
          )}
        </div>
      ),
    },
  ];

  const last = step === steps.length - 1;
  const finish = () => router.push(href(`/plotfit/results?${criteriaToQuery(c)}`));
  const s = steps[step];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8" aria-hidden="true">
        <div className="flex justify-between text-xs text-slate"><span>{w.progress(step + 1, steps.length)}</span><span>{Math.round(((step + 1) / steps.length) * 100)}%</span></div>
        <div className="liquid-track mt-2"><div className="liquid-track-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <section aria-live="polite" aria-labelledby="pf-q" key={step} className="vd-pop surface p-6 sm:p-10" style={{ ["--i" as string]: 0 }}>
        <p className="annot text-emerald">PlotFit · {s.essential ? w.essential : w.optional}</p>
        <h2 id="pf-q" className="mt-4 text-4xl text-navy">{s.title}</h2>
        {s.hint && <p className="mt-2 text-slate">{s.hint}</p>}
        <div className="mt-8">{s.body}</div>
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn btn-outline text-navy" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>{w.back}</button>
        <div className="flex gap-2">
          {!s.essential && !last && <button type="button" className="btn text-slate underline" onClick={() => setStep((x) => x + 1)}>{w.skip}</button>}
          {last ? (
            <button type="button" className="btn btn-gold" onClick={finish}>{w.finish}</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setStep((x) => x + 1)}>{w.next}</button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-sm"><button type="button" onClick={finish} className="text-slate underline">{w.now}</button></p>
    </div>
  );
}

function Tile({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`liquid-tile min-h-14 px-4 py-3 text-left ${selected ? "is-on" : ""}`}>
      {children}
    </button>
  );
}
