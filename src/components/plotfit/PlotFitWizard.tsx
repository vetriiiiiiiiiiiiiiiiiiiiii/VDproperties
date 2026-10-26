"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { criteriaToQuery, FACILITY_KINDS, type Criteria } from "@/lib/plotfit";

type Location = { slug: string; name: string };

const EMPTY: Criteria = {
  budget: undefined, reservePct: undefined, locations: [], strictLocation: false, type: "either", timeline: "unsure", bedrooms: undefined,
  builtUp: undefined, parking: false, garden: false, office: false, facilities: [], maxKm: undefined, includeUnavailable: false,
};

export function PlotFitWizard({ locations, initial }: { locations: Location[]; initial?: Partial<Criteria> }) {
  const router = useRouter();
  const [c, setC] = useState<Criteria>({ ...EMPTY, ...initial });
  const [step, setStep] = useState(0);
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => setC((x) => ({ ...x, [k]: v }));

  const steps: { title: string; hint: string; essential?: boolean; body: React.ReactNode }[] = [
    {
      title: "What is your total budget?",
      hint: "Everything you plan to spend — land or house, plus any building and other costs.",
      body: (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {[2500000, 5000000, 10000000, 20000000].map((v) => (
              <Tile key={v} selected={c.budget === v} onClick={() => set("budget", v)}>{formatPrice(v)}</Tile>
            ))}
          </div>
          <label className="block text-sm">
            Or enter an amount (₹)
            <input type="number" min={0} step={100000} value={c.budget ?? ""} onChange={(e) => set("budget", e.target.value ? Number(e.target.value) : undefined)} className="field mt-1" />
          </label>
        </div>
      ),
    },
    {
      title: "Which locations do you prefer?",
      hint: "Choose any number. Leave empty if you're open to anywhere we work.",
      body: (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {locations.map((l) => (
              <Tile key={l.slug} selected={c.locations.includes(l.slug)} onClick={() => set("locations", c.locations.includes(l.slug) ? c.locations.filter((x) => x !== l.slug) : [...c.locations, l.slug])}>{l.name}</Tile>
            ))}
          </div>
          {locations.length === 0 && <p className="text-sm text-slate">No locations are listed yet.</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-emerald" checked={c.strictLocation} onChange={(e) => set("strictLocation", e.target.checked)} /> Only show these locations</label>
        </div>
      ),
    },
    {
      title: "Land, a house, or either?",
      hint: "",
      essential: true,
      body: (
        <div className="grid gap-2 sm:grid-cols-3">
          {([["land", "Land or a plot", "To build on"], ["home", "A house", "Ready to move in"], ["either", "Either", "Show me both"]] as const).map(([v, l, d]) => (
            <Tile key={v} selected={c.type === v} onClick={() => set("type", v)}><span className="block font-serif text-2xl">{l}</span><span className="text-sm opacity-75">{d}</span></Tile>
          ))}
        </div>
      ),
    },
    {
      title: "When do you plan to build?",
      hint: "Helps us flag plots that don't yet have water or power on record.",
      body: (
        <div className="grid gap-2 sm:grid-cols-3">
          {([["now", "Soon"], ["later", "In the future"], ["unsure", "Not sure"]] as const).map(([v, l]) => (
            <Tile key={v} selected={c.timeline === v} onClick={() => set("timeline", v)}>{l}</Tile>
          ))}
        </div>
      ),
    },
    {
      title: "How many bedrooms do you need?",
      hint: "For houses this is a requirement; for land we use it to size the house you'd build.",
      body: (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((n) => <Tile key={n} selected={c.bedrooms === n} onClick={() => set("bedrooms", n)}>{n}{n === 6 ? "+" : ""}</Tile>)}
        </div>
      ),
    },
    {
      title: "Roughly how big a home?",
      hint: "Total built-up area across all floors.",
      body: (
        <div className="space-y-3">
          <p className="font-serif text-4xl text-navy">{c.builtUp ? `${c.builtUp.toLocaleString("en-IN")} sq ft` : "No preference"}</p>
          <input type="range" min={600} max={5000} step={100} value={c.builtUp ?? 1600} onChange={(e) => set("builtUp", Number(e.target.value))} className="w-full accent-emerald" aria-label="Preferred built-up area in square feet" />
          {c.builtUp && <button type="button" onClick={() => set("builtUp", undefined)} className="text-sm underline">Clear</button>}
        </div>
      ),
    },
    {
      title: "Anything you need at home?",
      hint: "",
      body: (
        <div className="grid gap-2 sm:grid-cols-3">
          <Tile selected={c.parking} onClick={() => set("parking", !c.parking)}>Parking</Tile>
          <Tile selected={c.garden} onClick={() => set("garden", !c.garden)}>A garden</Tile>
          <Tile selected={c.office} onClick={() => set("office", !c.office)}>A home office</Tile>
        </div>
      ),
    },
    {
      title: "What should be close by?",
      hint: "We only count facilities that are on record — and we tell you when something is only proposed.",
      body: (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(FACILITY_KINDS).map(([k, l]) => (
              <Tile key={k} selected={c.facilities.includes(k)} onClick={() => set("facilities", c.facilities.includes(k) ? c.facilities.filter((x) => x !== k) : [...c.facilities, k])}>{l}</Tile>
            ))}
          </div>
          <label className="block text-sm">
            Within {c.maxKm ?? 5} km
            <input type="range" min={1} max={25} value={c.maxKm ?? 5} onChange={(e) => set("maxKm", Number(e.target.value))} className="w-full accent-emerald" />
          </label>
        </div>
      ),
    },
    {
      title: "How much must stay free for building and other costs?",
      hint: "We'll only match properties priced within what's left.",
      body: (
        <div className="space-y-3">
          <p className="font-serif text-4xl text-navy">{c.reservePct ?? 0}% kept aside</p>
          <input type="range" min={0} max={80} step={5} value={c.reservePct ?? 0} onChange={(e) => set("reservePct", Number(e.target.value))} className="w-full accent-emerald" aria-label="Share of budget kept aside" />
          {c.budget ? (
            <p className="text-slate">
              {formatPrice(c.budget * ((c.reservePct ?? 0) / 100))} kept for construction and costs · up to <strong className="text-ink">{formatPrice(c.budget * (1 - (c.reservePct ?? 0) / 100))}</strong> for the property
            </p>
          ) : (
            <p className="text-slate">Add a budget in step 1 to see amounts.</p>
          )}
        </div>
      ),
    },
  ];

  const last = step === steps.length - 1;
  const finish = () => router.push(`/plotfit/results?${criteriaToQuery(c)}`);
  const s = steps[step];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8" aria-hidden="true">
        <div className="flex justify-between text-xs text-slate"><span>Question {step + 1} of {steps.length}</span><span>{Math.round(((step + 1) / steps.length) * 100)}%</span></div>
        <div className="mt-2 h-1.5 bg-line"><div className="h-full bg-sun transition-[width] duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <section aria-live="polite" aria-labelledby="pf-q" key={step} className="vd-pop border border-line bg-white p-6 sm:p-10" style={{ ["--i" as string]: 0 }}>
        <p className="annot text-emerald">PlotFit · {s.essential ? "essential" : "optional"}</p>
        <h2 id="pf-q" className="mt-4 text-4xl text-navy">{s.title}</h2>
        {s.hint && <p className="mt-2 text-slate">{s.hint}</p>}
        <div className="mt-8">{s.body}</div>
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn btn-outline text-navy" disabled={step === 0} onClick={() => setStep((x) => x - 1)}>Back</button>
        <div className="flex gap-2">
          {!s.essential && !last && <button type="button" className="btn text-slate underline" onClick={() => setStep((x) => x + 1)}>Skip</button>}
          {last ? (
            <button type="button" className="btn btn-gold" onClick={finish}>Find My Property</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setStep((x) => x + 1)}>Next</button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-sm"><button type="button" onClick={finish} className="text-slate underline">See matches now with what I've answered</button></p>
    </div>
  );
}

function Tile({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`min-h-14 border px-4 py-3 text-left transition-colors ${selected ? "border-forest bg-forest text-ivory" : "border-line bg-ivory hover:border-emerald"}`}>
      {children}
    </button>
  );
}
