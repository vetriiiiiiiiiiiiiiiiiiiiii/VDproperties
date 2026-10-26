"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { CATEGORY_OPTIONS, type SearchFilters } from "@/lib/search";

type Facets = {
  locations: { slug: string; name: string }[];
  amenities: { slug: string; name: string }[];
  hasBuiltUp: boolean;
  hasLandArea: boolean;
  hasPrices: boolean;
  bedroomOptions: number[];
  projectStatuses: ("UPCOMING" | "ONGOING" | "COMPLETED")[];
};

export function FilterPanel({
  action,
  filters,
  facets,
  scope,
}: {
  action: string;
  filters: SearchFilters;
  facets: Facets;
  scope: "all" | "land" | "homes";
}) {
  const router = useRouter();
  const { t } = useI18n();
  const x = t.listings.filters;
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(filters.amenities ?? []);
  useEffect(() => setAmenities(filters.amenities ?? []), [filters.amenities]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const typeOptions = scope === "land" ? (["RESIDENTIAL_PLOT", "LAND"] as const) : scope === "homes" ? (["HOUSE", "VILLA"] as const) : (["RESIDENTIAL_PLOT", "LAND", "HOUSE", "VILLA"] as const);
  const showHomes = scope !== "land" && facets.hasBuiltUp;
  const showLand = scope !== "homes" && facets.hasLandArea;
  const key = JSON.stringify(filters);

  return (
    <>
      <button type="button" className="btn btn-outline w-full text-navy lg:hidden" aria-expanded={open} aria-controls="filters" onClick={() => setOpen(true)}>
        {x.open}
      </button>
      <div
        id="filters"
        className={`${open ? "fixed inset-0 z-50 flex" : "hidden"} lg:static lg:block`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={x.aria}
      >
        {open && <button type="button" tabIndex={-1} aria-hidden="true" className="flex-1 bg-ink/50 lg:hidden" onClick={() => setOpen(false)} />}
        <form
          key={key}
          action={action}
          method="get"
          onSubmit={(e) => {
            // Build a clean, shareable URL without empty parameters.
            e.preventDefault();
            const params = new URLSearchParams();
            for (const [k, v] of new FormData(e.currentTarget).entries()) if (typeof v === "string" && v.trim()) params.set(k, v.trim());
            setOpen(false);
            const qs = params.toString();
            startTransition(() => router.push(qs ? `${action}?${qs}` : action));
          }}
          className="flex w-[min(24rem,90vw)] flex-col overflow-y-auto bg-white lg:w-auto lg:overflow-visible lg:rounded-[1rem] lg:shadow-[0_24px_48px_-36px_rgba(10,52,104,0.45)]"
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="annot text-emerald">{x.refine}</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-sm underline lg:hidden">{x.close}</button>
          </div>
          <div className="flex-1 space-y-6 p-5">
            <div>
              <label htmlFor="f-q" className="field-label">{x.keyword}</label>
              <input id="f-q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder={x.keywordPlaceholder} className="field" />
            </div>
            {scope === "all" && (
              <div>
                <label htmlFor="f-cat" className="field-label">{x.category}</label>
                <select id="f-cat" name="category" defaultValue={filters.category ?? ""} className="field">
                  <option value="">{x.allCategories}</option>
                  {(Object.keys(CATEGORY_OPTIONS) as (keyof typeof CATEGORY_OPTIONS)[]).map((v) => (
                    <option key={v} value={v}>{x.categories[v]}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="f-type" className="field-label">{x.type}</label>
              <select id="f-type" name="type" defaultValue={filters.type ?? ""} className="field">
                <option value="">{x.any}</option>
                {typeOptions.map((v) => (
                  <option key={v} value={v}>{t.labels.propertyType[v]}</option>
                ))}
              </select>
            </div>
            {facets.locations.length > 0 && (
              <div>
                <label htmlFor="f-loc" className="field-label">{x.location}</label>
                <select id="f-loc" name="location" defaultValue={filters.location ?? ""} className="field">
                  <option value="">{x.anyLocation}</option>
                  {facets.locations.map((l) => (
                    <option key={l.slug} value={l.slug}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
            {facets.hasPrices && (
              <fieldset>
                <legend className="field-label">{x.budget}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label={x.minBudget} name="minPrice" type="number" min={0} step={50000} inputMode="numeric" defaultValue={filters.minPrice ?? ""} placeholder="Min" className="field" />
                  <input aria-label={x.maxBudget} name="maxPrice" type="number" min={0} step={50000} inputMode="numeric" defaultValue={filters.maxPrice ?? ""} placeholder="Max" className="field" />
                </div>
                <p className="field-hint">{x.budgetHint}</p>
              </fieldset>
            )}
            {showLand && (
              <fieldset>
                <legend className="field-label">{x.landArea}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label={x.minArea} name="minLand" type="number" min={0} inputMode="numeric" defaultValue={filters.minLand ?? ""} placeholder="Min" className="field" />
                  <input aria-label={x.maxArea} name="maxLand" type="number" min={0} inputMode="numeric" defaultValue={filters.maxLand ?? ""} placeholder="Max" className="field" />
                </div>
              </fieldset>
            )}
            {showHomes && (
              <fieldset>
                <legend className="field-label">{x.builtArea}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label={x.minArea} name="minBuilt" type="number" min={0} inputMode="numeric" defaultValue={filters.minBuilt ?? ""} placeholder="Min" className="field" />
                  <input aria-label={x.maxArea} name="maxBuilt" type="number" min={0} inputMode="numeric" defaultValue={filters.maxBuilt ?? ""} placeholder="Max" className="field" />
                </div>
              </fieldset>
            )}
            {scope !== "land" && facets.bedroomOptions.length > 0 && (
              <div>
                <label htmlFor="f-beds" className="field-label">{x.bedrooms}</label>
                <select id="f-beds" name="beds" defaultValue={filters.beds ?? ""} className="field">
                  <option value="">{x.any}</option>
                  {facets.bedroomOptions.map((b) => (
                    <option key={b} value={b}>{x.bedsPlus(b)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="f-av" className="field-label">{x.availability}</label>
              <select id="f-av" name="availability" defaultValue={filters.availability ?? ""} className="field">
                <option value="">{x.availabilityOpts.current}</option>
                <option value="available">{x.availabilityOpts.available}</option>
                <option value="all">{x.availabilityOpts.all}</option>
              </select>
            </div>
            {facets.projectStatuses.length > 0 && (
              <div>
                <label htmlFor="f-ps" className="field-label">{x.projectStatus}</label>
                <select id="f-ps" name="projectStatus" defaultValue={filters.projectStatus ?? ""} className="field">
                  <option value="">{x.any}</option>
                  {facets.projectStatuses.map((s) => (
                    <option key={s} value={s}>{x.projectOpt(t.labels.projectStatus[s])}</option>
                  ))}
                </select>
              </div>
            )}
            {facets.amenities.length > 0 && (
              <fieldset>
                <legend className="field-label">{x.amenities}</legend>
                <input type="hidden" name="amenities" value={amenities.join(",")} />
                <ul className="mt-1 space-y-2">
                  {facets.amenities.map((a) => (
                    <li key={a.slug}>
                      <label className="flex items-center gap-2.5 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald"
                          checked={amenities.includes(a.slug)}
                          onChange={(e) => setAmenities((cur) => (e.target.checked ? [...cur, a.slug] : cur.filter((x) => x !== a.slug)))}
                        />
                        {a.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t border-line bg-white/85 p-5 backdrop-blur lg:rounded-b-[1.75rem]">
            <button type="submit" className="btn btn-primary flex-1" disabled={pending} aria-busy={pending}>
              {pending ? x.updating : x.apply}
            </button>
            <a href={action} className="btn btn-outline text-navy">{x.clear}</a>
          </div>
        </form>
      </div>
    </>
  );
}
