"use client";

import Link from "@/i18n/Link";
import { useI18n } from "@/i18n/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { saveScenario, type ScenarioPayload } from "@/app/account/_actions/customer";
import { estimateBudget, type Basis, type CostCard, type LineKey } from "@/lib/studio/estimate";
import { DEFAULT_INPUTS, generateLayout, HOUSE_STYLES, type HouseStyle, type PlotGeometry, type StudioInputs } from "@/lib/studio/layout";
import { ConsultForm } from "./ConsultForm";
import { FloorPlan, Massing, SitePlan } from "./Drawings";

export type StudioProperty = {
  id: string;
  slug: string;
  referenceCode: string;
  title: string;
  price: number | null;
  availability: string;
  constraints: string | null;
  isSample: boolean;
} | null;

type Cards = Record<"BASIC" | "STANDARD" | "PREMIUM", CostCard | null>;

const BASIS_STYLE: Record<Basis, string> = {
  QUOTED: "bg-navy text-ivory",
  ESTIMATED: "bg-gold/25 text-gold-deep",
  USER: "bg-emerald text-ivory",
  MISSING: "bg-terracotta/15 text-terracotta-deep",
};

function readInputs(sp: URLSearchParams): StudioInputs {
  const n = (k: string, d: number) => (sp.has(k) && Number.isFinite(Number(sp.get(k))) ? Number(sp.get(k)) : d);
  const style = sp.get("style") as HouseStyle | null;
  const fin = sp.get("finish");
  return {
    bedrooms: n("bed", DEFAULT_INPUTS.bedrooms),
    floors: n("fl", DEFAULT_INPUTS.floors),
    builtUpSqft: n("area", DEFAULT_INPUTS.builtUpSqft),
    style: style && style in HOUSE_STYLES ? style : DEFAULT_INPUTS.style,
    parkingSlots: n("park", DEFAULT_INPUTS.parkingSlots),
    garden: sp.has("garden") ? sp.get("garden") === "1" : DEFAULT_INPUTS.garden,
    study: sp.get("study") === "1",
    finish: fin === "BASIC" || fin === "PREMIUM" ? fin : "STANDARD",
    targetBudget: sp.has("budget") ? n("budget", 0) || null : null,
  };
}

export function StudioPlanner({
  property,
  basePlot,
  cards,
  signedIn,
  businessName,
  initialLandPrice,
}: {
  initialLandPrice?: number | null;
  property: StudioProperty;
  basePlot: PlotGeometry;
  cards: Cards;
  signedIn: boolean;
  businessName: string;
}) {
  const router = useRouter();
  const { t, f } = useI18n();
  const pl = t.studio.planner;
  const pathname = usePathname();
  const params = useSearchParams();
  const [inputs, setInputs] = useState<StudioInputs>(() => readInputs(new URLSearchParams(params.toString())));
  const [setbacks, setSetbacks] = useState(basePlot.setbacks);
  const [coverage, setCoverage] = useState<number | null>(basePlot.maxCoveragePct);
  const [overrides, setOverrides] = useState<Partial<Record<LineKey, number>>>(() => (initialLandPrice ? { land: initialLandPrice } : {}));
  const [view, setView] = useState<"site" | "floors" | "massing">("site");
  const [level, setLevel] = useState(0);
  const [name, setName] = useState(pl.defaultName(property?.referenceCode ?? null, inputs.bedrooms));
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [consult, setConsult] = useState(false);

  const setbacksEditable = basePlot.setbackSource !== "RECORD";
  const coverageEditable = basePlot.coverageSource !== "RECORD";
  const plot: PlotGeometry = useMemo(
    () => ({
      ...basePlot,
      setbacks,
      setbackSource: setbacksEditable && JSON.stringify(setbacks) !== JSON.stringify(basePlot.setbacks) ? "USER" : basePlot.setbackSource,
      maxCoveragePct: coverage,
      coverageSource: coverage === null ? null : coverageEditable ? (coverage === basePlot.maxCoveragePct ? basePlot.coverageSource : "USER") : "RECORD",
    }),
    [basePlot, setbacks, coverage, setbacksEditable, coverageEditable],
  );
  const result = useMemo(() => generateLayout(plot, inputs), [plot, inputs]);
  const card = cards[inputs.finish];
  const estimate = useMemo(
    () =>
      estimateBudget({
        quotedLandPrice: property?.price ?? null,
        builtUpSqft: result.achievedBuiltUpSqft,
        footprintSqft: result.footprintSqft,
        gardenSqft: result.gardenSqft,
        parkingSlots: result.parking.length,
        card,
        overrides,
      }),
    [property, result, card, overrides],
  );
  const level0 = Math.min(level, Math.max(0, result.floors.length - 1));

  // Keep choices in the URL so the configuration survives sign-in and can be shared.
  useEffect(() => {
    const p = new URLSearchParams(params.toString());
    const set = (k: string, v: string | null) => (v === null ? p.delete(k) : p.set(k, v));
    set("bed", String(inputs.bedrooms));
    set("fl", String(inputs.floors));
    set("area", String(inputs.builtUpSqft));
    set("style", inputs.style);
    set("park", String(inputs.parkingSlots));
    set("garden", inputs.garden ? "1" : "0");
    set("study", inputs.study ? "1" : null);
    set("finish", inputs.finish);
    set("budget", inputs.targetBudget ? String(inputs.targetBudget) : null);
    window.history.replaceState(null, "", `${pathname}?${p.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const upd = <K extends keyof StudioInputs>(k: K, v: StudioInputs[K]) => setInputs((i) => ({ ...i, [k]: v }));
  const nextPath = typeof window === "undefined" ? pathname : `${pathname}${window.location.search}`;

  function payload(): ScenarioPayload {
    return {
      name,
      propertyId: property?.id ?? null,
      inputs: { ...inputs, targetBudget: inputs.targetBudget ?? null },
      illustrativePlot: property ? null : { widthFt: basePlot.widthFt, depthFt: basePlot.depthFt, price: overrides.land ?? null },
      setbacks: setbacksEditable ? setbacks : null,
      maxCoveragePct: coverageEditable ? coverage : null,
      overrides: Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)) as Record<LineKey, number>,
    };
  }

  const budgetDiff = inputs.targetBudget ? inputs.targetBudget - estimate.total : null;
  const summary = pl.summary(
    inputs.bedrooms,
    inputs.floors,
    pl.styles[inputs.style],
    f.area(result.achievedBuiltUpSqft),
    property ? pl.plotRef(property.referenceCode, plot.widthFt, plot.depthFt) : pl.plotIll(plot.widthFt, plot.depthFt),
    f.rupees(estimate.total),
    estimate.complete,
  );
  const sqft = (n: number) => f.area(n);

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      {/* ── Controls */}
      <aside className="space-y-5 print:hidden" aria-label={pl.controls}>
        <section className="surface p-5">
          <h2 className="annot text-emerald">{pl.plot}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-slate">{pl.frontage}</dt><dd className="font-semibold">{plot.widthFt} ft <SourceTag s={plot.illustrative ? "USER" : "RECORD"} /></dd></div>
            <div><dt className="text-slate">{pl.depth}</dt><dd className="font-semibold">{plot.depthFt} ft <SourceTag s={plot.illustrative ? "USER" : "RECORD"} /></dd></div>
            <div className="col-span-2"><dt className="text-slate">{pl.plotArea}</dt><dd className="font-semibold">{sqft(result.plotAreaSqft)}</dd></div>
          </dl>
          <fieldset className="mt-4">
            <legend className="field-label">{pl.setbacks} <SourceTag s={plot.setbackSource} /></legend>
            <div className="grid grid-cols-3 gap-2">
              {(["front", "rear", "side"] as const).map((k) => (
                <label key={k} className="text-xs text-slate">
                  {pl.sides[k]}
                  <input type="number" min={0} max={50} step={0.5} value={setbacks[k]} disabled={!setbacksEditable} onChange={(e) => setSetbacks((sb) => ({ ...sb, [k]: Math.max(0, Number(e.target.value) || 0) }))} className="field mt-1 min-h-9 py-1 text-sm disabled:bg-paper" />
                </label>
              ))}
            </div>
            {setbacksEditable && <p className="field-hint">{pl.setbacksHint}</p>}
          </fieldset>
          <label className="mt-4 block text-sm">
            <span className="field-label">{pl.coverage} <SourceTag s={plot.coverageSource ?? "MISSING"} /></span>
            <input type="number" min={10} max={100} value={coverage ?? ""} disabled={!coverageEditable} placeholder={pl.notOnRecord} onChange={(e) => setCoverage(e.target.value ? Number(e.target.value) : null)} className="field min-h-9 py-1 text-sm disabled:bg-paper" />
          </label>
          {property?.constraints && <p className="mt-3 rounded-xl border-l-4 border-gold bg-paper p-2 text-xs">{pl.constraints(property.constraints)}</p>}
        </section>

        <section className="surface p-5">
          <h2 className="annot text-emerald">{pl.home}</h2>
          <div className="mt-3 space-y-4">
            <Stepper label={pl.bedrooms} value={inputs.bedrooms} min={1} max={6} onChange={(v) => upd("bedrooms", v)} />
            <Segmented label={pl.floors} name="floors" value={String(inputs.floors)} options={[["1", "1"], ["2", "2"], ["3", "3"]]} onChange={(v) => upd("floors", Number(v))} />
            <div>
              <label className="field-label" htmlFor="st-area">{pl.builtUp(sqft(inputs.builtUpSqft))}</label>
              <input id="st-area" type="range" min={500} max={6000} step={50} value={inputs.builtUpSqft} onChange={(e) => upd("builtUpSqft", Number(e.target.value))} className="w-full accent-emerald" />
            </div>
            <label className="block">
              <span className="field-label">{pl.style}</span>
              <select value={inputs.style} onChange={(e) => upd("style", e.target.value as HouseStyle)} className="field min-h-10 py-1.5 text-sm">
                {(Object.keys(HOUSE_STYLES) as HouseStyle[]).map((k) => <option key={k} value={k}>{pl.styles[k]}</option>)}
              </select>
            </label>
            <Stepper label={pl.parking} value={inputs.parkingSlots} min={0} max={4} onChange={(v) => upd("parkingSlots", v)} />
            <div className="flex flex-wrap gap-4">
              <Toggle label={pl.garden} checked={inputs.garden} onChange={(v) => upd("garden", v)} />
              <Toggle label={pl.study} checked={inputs.study} onChange={(v) => upd("study", v)} />
            </div>
            <Segmented label={pl.finish} name="finish" value={inputs.finish} options={(["BASIC", "STANDARD", "PREMIUM"] as const).map((k) => [k, pl.finishes[k]])} onChange={(v) => upd("finish", v as StudioInputs["finish"])} />
            <label className="block">
              <span className="field-label">{pl.target}</span>
              <input type="number" min={0} step={100000} value={inputs.targetBudget ?? ""} placeholder={t.studio.index.optional} onChange={(e) => upd("targetBudget", e.target.value ? Number(e.target.value) : null)} className="field min-h-10 py-1.5 text-sm" />
            </label>
          </div>
        </section>
      </aside>

      {/* ── Drawing board */}
      <div className="min-w-0 space-y-6">
        <section className="surface overflow-hidden" aria-labelledby="board-h">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 print:hidden">
            <h2 id="board-h" className="annot text-navy">{pl.drawing}</h2>
            <div role="tablist" aria-label={pl.viewLabel} className="liquid-seg text-sm" style={{ "--n": 3, "--at": ["site", "floors", "massing"].indexOf(view) } as React.CSSProperties}>
              {(["site", "floors", "massing"] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className="liquid-seg-item">{pl.views[k]}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1fr_15rem]">
            <div className="p-4" role="tabpanel">
              {view === "site" && <SitePlan plot={plot} result={result} inputs={inputs} />}
              {view === "floors" && (
                <>
                  <div className="mb-2 flex gap-2 text-sm">
                    {result.floors.map((fl) => (
                      <button key={fl.level} type="button" onClick={() => setLevel(fl.level)} aria-pressed={level0 === fl.level} className={`liquid-tile px-3 py-1 ${level0 === fl.level ? "is-on" : ""}`}>{pl.floorName(fl.level)}</button>
                    ))}
                  </div>
                  {result.floors.length ? <FloorPlan plot={plot} result={result} level={level0} /> : <p className="p-10 text-center text-slate">{pl.noFloor}</p>}
                </>
              )}
              {view === "massing" && <Massing plot={plot} result={result} inputs={inputs} />}
            </div>
            <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 border-t border-line bg-paper p-4 text-sm lg:grid-cols-1 lg:border-l lg:border-t-0">
              <Fact k={pl.facts.achieved} v={sqft(result.achievedBuiltUpSqft)} />
              <Fact k={pl.facts.requested} v={sqft(result.requestedBuiltUpSqft)} />
              <Fact k={pl.facts.footprint} v={sqft(result.footprintSqft)} />
              <Fact k={pl.facts.coverage} v={`${result.coveragePct}%`} />
              <Fact k={pl.facts.far} v={String(result.floorAreaRatio)} />
              <Fact k={pl.facts.max} v={sqft(Math.max(0, result.maxBuiltUpSqft))} />
              <Fact k={pl.facts.garden} v={result.gardenSqft ? sqft(result.gardenSqft) : "—"} />
              <Fact k={pl.facts.parking} v={result.parking.length ? `${result.parking.length} ${result.parkingInEnvelope ? pl.facts.covered : pl.facts.open}` : "—"} />
            </dl>
          </div>
          <ul className="space-y-1.5 border-t border-line p-4 text-sm" aria-label={pl.notes}>
            <li className={`font-semibold ${result.feasible ? "text-emerald" : "text-terracotta-deep"}`}>{result.feasible ? pl.fits : pl.noFit}</li>
            {result.warnings.map((w, i) => (
              <li key={i} className={w.level === "blocker" ? "text-terracotta-deep" : w.level === "caution" ? "text-gold-deep" : "text-slate"}>
                {w.level === "blocker" ? "✕" : w.level === "caution" ? "!" : "·"} {w.text ?? t.studio.warnings[w.code](w.params ?? {})}
              </li>
            ))}
            <li className="text-slate">· {pl.disclaimer}</li>
          </ul>
        </section>

        {/* ── Budget */}
        <section className="surface overflow-hidden" aria-labelledby="budget-h">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id="budget-h" className="annot text-navy">{pl.budget}</h2>
            <p className="text-xs text-slate">
              {card ? (
                <>{pl.rates} <strong>{card.name}</strong> · {card.source} · {pl.effective} {card.effectiveDate}{card.isDemo && <span className="ml-1 text-terracotta-deep">{pl.demo}</span>}</>
              ) : (
                <span className="text-terracotta-deep">{pl.noCard(pl.finishes[inputs.finish].toLocaleLowerCase())}</span>
              )}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate">
                <tr><th scope="col" className="px-4 py-2">{pl.cols.item}</th><th scope="col" className="px-4 py-2">{pl.cols.basis}</th><th scope="col" className="px-4 py-2 text-right">{pl.cols.amount}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {estimate.lines.map((l) => (
                  <tr key={l.key}>
                    <td className="px-4 py-2.5"><span className="font-medium">{t.studio.lines[l.key]}</span><span className="block text-xs text-slate">{t.studio.detail[l.detail](l.params ?? {})}</span></td>
                    <td className="px-4 py-2.5"><span className={`annot-plain inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] ${BASIS_STYLE[l.basis]}`}>{pl.basis[l.basis]}</span></td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        aria-label={pl.amountLabel(t.studio.lines[l.key])}
                        value={overrides[l.key] ?? l.amount ?? ""}
                        placeholder={pl.enter}
                        onChange={(e) => setOverrides((o) => ({ ...o, [l.key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                        className="field ml-auto min-h-9 w-36 py-1 text-right text-sm print:border-0"
                      />
                      {overrides[l.key] !== undefined && (
                        <button type="button" className="mt-1 block w-full text-right text-xs text-slate underline print:hidden" onClick={() => setOverrides((o) => ({ ...o, [l.key]: undefined }))}>{pl.reset}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-navy">
                  <td className="px-4 py-3 font-serif text-xl text-navy" colSpan={2}>{pl.total}{!estimate.complete && <span className="block font-sans text-xs text-terracotta-deep">{pl.incomplete(estimate.missing.map((k) => t.studio.lines[k].toLocaleLowerCase()).join(", "))}</span>}</td>
                  <td className="px-4 py-3 text-right font-serif text-2xl text-navy">{f.price(estimate.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {budgetDiff !== null && (
            <div className="border-t border-line p-4">
              <div className="flex justify-between text-sm"><span>{pl.against(f.price(inputs.targetBudget!))}</span><strong className={budgetDiff >= 0 ? "text-emerald" : "text-terracotta-deep"}>{budgetDiff >= 0 ? pl.under(f.price(budgetDiff)) : pl.over(f.price(-budgetDiff))}</strong></div>
              <div className="liquid-track mt-2" role="img" aria-label={pl.shareLabel}>
                <div className={budgetDiff >= 0 ? "liquid-track-fill" : "h-full rounded-full bg-terracotta transition-[width] duration-700"} style={{ width: `${Math.min(100, (estimate.total / inputs.targetBudget!) * 100)}%` }} />
              </div>
            </div>
          )}
          <p className="border-t border-line p-4 text-xs text-slate">{pl.estimateNote}</p>
        </section>

        {/* ── Actions */}
        <section className="flex flex-col gap-4 rounded-[1rem] bg-navy p-5 text-ivory print:hidden lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            {signedIn ? (
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[14rem] flex-1">
                  <span className="annot-plain text-gold-light">{pl.scenarioName}</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="field mt-1 min-h-10 py-1.5 text-sm" />
                </label>
                <button
                  type="button"
                  disabled={saving}
                  className="btn btn-gold min-h-10"
                  onClick={() =>
                    startSave(async () => {
                      const r = await saveScenario(payload());
                      setSaveMsg({ ok: r.ok, text: r.message });
                      if (r.ok) router.refresh();
                    })
                  }
                >
                  {saving ? pl.saving : pl.save}
                </button>
                <Link href="/account/compare" className="btn btn-outline min-h-10">{pl.compareSaved}</Link>
              </div>
            ) : (
              <p className="text-sm text-ivory/85">
                <Link href={`/account/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-gold-light underline">{pl.signInA}</Link> {pl.signInOr}{" "}
                <Link href={`/account/register?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-gold-light underline">{pl.signInB}</Link> {pl.signInTail}
              </p>
            )}
            {saveMsg && <p role="status" className={`mt-2 text-sm ${saveMsg.ok ? "text-leaf" : "text-sun-light"}`}>{saveMsg.text}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {property && <Link href={`/compare?p=${property.slug}`} className="btn btn-outline min-h-10">{pl.comparePlot}</Link>}
            <button type="button" onClick={() => window.print()} className="btn btn-outline min-h-10">{pl.print}</button>
            <button type="button" onClick={() => setConsult((c) => !c)} aria-expanded={consult} className="btn btn-gold min-h-10">{pl.consult}</button>
          </div>
        </section>
        {consult && (
          <section className="surface p-5 print:hidden">
            <ConsultForm propertyId={property?.id} summary={summary} builtUp={result.achievedBuiltUpSqft} plotArea={Math.round(result.plotAreaSqft)} businessName={businessName} />
          </section>
        )}
        <p className="hidden text-sm print:block">{summary}</p>
      </div>
    </div>
  );
}

const SOURCE_TONE = { RECORD: "text-emerald", ASSUMED: "text-gold-deep", USER: "text-navy", MISSING: "text-slate" } as const;
function SourceTag({ s }: { s: keyof typeof SOURCE_TONE }) {
  const { t } = useI18n();
  return <span className={`ml-1 text-[0.65rem] font-semibold uppercase tracking-wider ${SOURCE_TONE[s]}`}>{t.studio.planner.source[s]}</span>;
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="annot-plain text-[0.6rem] text-slate">{k}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{v}</dd>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between">
      <span className="field-label mb-0">{label}</span>
      <div className="flex items-center rounded-full border border-line bg-ivory" role="group" aria-label={label}>
        <button type="button" className="h-9 w-9 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={t.studio.planner.fewer(label)}>−</button>
        <output className="w-8 text-center font-semibold" aria-live="polite">{value}</output>
        <button type="button" className="h-9 w-9 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={t.studio.planner.more(label)}>+</button>
      </div>
    </div>
  );
}

function Segmented({ label, name, value, options, onChange }: { label: string; name: string; value: string; options: (readonly [string, string])[]; onChange: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="liquid-seg w-full" style={{ "--n": options.length, "--at": Math.max(0, options.findIndex(([v]) => v === value)) } as React.CSSProperties}>
        {options.map(([v, l]) => (
          <label key={v} data-on={value === v} className="liquid-seg-item cursor-pointer text-center text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold">
            <input type="radio" className="sr-only" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-emerald" />
      {label}
    </label>
  );
}
