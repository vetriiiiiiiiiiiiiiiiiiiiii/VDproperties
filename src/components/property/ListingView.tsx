import Link from "next/link";
import { redirect } from "next/navigation";
import { formatArea, formatPrice } from "@/lib/format";
import { PROJECT_STATUS_LABEL, PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { getSearchFacets, searchMapPins, searchProperties } from "@/lib/queries";
import { MapView } from "@/components/twin/MapView";
import { formatPrice as fp } from "@/lib/format";
import {
  AVAILABILITY_OPTIONS,
  CATEGORY_OPTIONS,
  hasActiveFilters,
  parseSearchParams,
  toQueryString,
  type RawSearchParams,
  type SearchFilters,
} from "@/lib/search";
import { FilterPanel } from "./FilterPanel";
import { PropertyCard } from "./PropertyCard";
import { SortSelect } from "./SortSelect";

type Scope = "all" | "land" | "homes";

export async function ListingView({ path, raw, scope }: { path: string; raw: RawSearchParams; scope: Scope }) {
  // Tidy URLs submitted with empty fields (e.g. from the homepage search) into a canonical, shareable form.
  if (Object.values(raw).some((v) => v === "" || (Array.isArray(v) && v.includes("")))) {
    redirect(`${path}${toQueryString(parseSearchParams(raw))}`);
  }

  const preset: Partial<SearchFilters> = scope === "land" ? { category: "land" } : scope === "homes" ? { category: "homes" } : {};
  const filters = parseSearchParams(raw, preset);
  const facetScope = scope === "land" ? { type: { in: ["RESIDENTIAL_PLOT", "LAND"] as never } } : scope === "homes" ? { type: { in: ["HOUSE", "VILLA"] as never } } : {};
  const view = raw.view === "map" ? "map" : "list";
  const [result, facets, map] = await Promise.all([searchProperties(filters), getSearchFacets(facetScope), view === "map" ? searchMapPins(filters) : null]);
  const qs = toQueryString({ ...filters, ...(scope === "all" ? {} : { category: undefined }), page: undefined });

  const userFilters: SearchFilters = scope === "all" ? filters : { ...filters, category: undefined };
  const chips = activeChips(userFilters, facets);
  const filtered = hasActiveFilters(userFilters);
  const from = (result.page - 1) * 9 + 1;
  const to = from + result.items.length - 1;

  return (
    <div className="wrap grid gap-8 py-10 lg:grid-cols-[19rem_1fr] lg:py-14">
      <aside aria-label="Search filters" className="lg:sticky lg:top-28 lg:self-start">
        <FilterPanel action={path} filters={userFilters} facets={facets} scope={scope} />
      </aside>

      <section aria-labelledby="results-h" aria-live="polite">
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="results-h" className="text-lg text-ink" style={{ fontFamily: "var(--font-sans)", fontWeight: 600, letterSpacing: 0 }}>
            {result.total === 0 ? "No properties found" : `${result.total} ${result.total === 1 ? "property" : "properties"}`}
            {result.total > 0 && result.pageCount > 1 && <span className="ml-2 text-sm font-normal text-slate">showing {from}–{to}</span>}
          </h2>
          <div className="flex items-center gap-3">
            <nav aria-label="Results view" className="flex border border-line bg-white text-sm">
              <Link href={`${path}${qs}`} aria-current={view === "list" ? "page" : undefined} className={`px-3 py-1.5 ${view === "list" ? "bg-forest text-ivory" : ""}`}>List</Link>
              <Link href={`${path}${qs}${qs ? "&" : "?"}view=map`} aria-current={view === "map" ? "page" : undefined} className={`px-3 py-1.5 ${view === "map" ? "bg-forest text-ivory" : ""}`}>Map</Link>
            </nav>
            {view === "list" && <SortSelect value={filters.sort} />}
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.key}>
                <Link
                  href={`${path}${toQueryString({ ...userFilters, ...c.remove, page: undefined })}`}
                  className="inline-flex items-center gap-2 border border-emerald/40 bg-white px-3 py-1.5 text-sm text-emerald hover:border-emerald"
                  aria-label={`Remove filter: ${c.label}`}
                >
                  {c.label} <span aria-hidden="true">×</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={path} className="ml-1 text-sm font-semibold text-slate underline hover:text-ink">Clear all</Link>
            </li>
          </ul>
        )}

        {map ? (
          <div className="mt-8">
            <MapView
              label="Map of matching properties"
              height={520}
              pins={map.pins.map((p) => ({ lat: p.latitude!, lng: p.longitude!, label: `${p.referenceCode} · ${p.title}${p.publicPrice !== null ? ` · ${fp(Number(p.publicPrice))}` : ""}`, href: `/twin/${p.slug}`, status: p.availability }))}
            />
            <p className="mt-3 text-sm text-slate">
              {map.pins.length} of {map.total} matching {map.total === 1 ? "property is" : "properties are"} shown. Others don't have an exact location authorised for publication — their locality appears on the listing.
            </p>
          </div>
        ) : result.items.length > 0 ? (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((p, i) => (
              <li key={p.id}>
                <PropertyCard p={p} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 border border-dashed border-line bg-white px-6 py-14 text-center">
            <p className="font-serif text-3xl text-navy">{filtered ? "Nothing matches those filters yet." : "No listings are published here yet."}</p>
            <p className="mx-auto mt-3 max-w-md text-slate">
              {filtered ? "Try widening your budget or area, or remove a filter." : "New properties are added as they're verified."} Or tell us what you're looking for and we'll get in touch.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {filtered && <Link href={path} className="btn btn-outline text-navy">Clear filters</Link>}
              <Link href="/contact#enquire" className="btn btn-primary">Tell us what you need</Link>
            </div>
          </div>
        )}

        {!map && result.pageCount > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-between border-t border-line pt-6">
            {result.page > 1 ? (
              <Link href={`${path}${toQueryString({ ...userFilters, page: result.page - 1 })}`} className="link-arrow text-emerald" rel="prev">Previous</Link>
            ) : <span />}
            <ol className="flex gap-1">
              {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
                <li key={n}>
                  <Link
                    href={`${path}${toQueryString({ ...userFilters, page: n })}`}
                    aria-current={n === result.page ? "page" : undefined}
                    className={`inline-flex h-10 w-10 items-center justify-center text-sm ${n === result.page ? "bg-forest text-ivory" : "border border-line bg-white hover:border-emerald"}`}
                  >
                    {n}
                  </Link>
                </li>
              ))}
            </ol>
            {result.page < result.pageCount ? (
              <Link href={`${path}${toQueryString({ ...userFilters, page: result.page + 1 })}`} className="link-arrow text-emerald" rel="next">Next</Link>
            ) : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}

type Facets = Awaited<ReturnType<typeof getSearchFacets>>;

function activeChips(f: SearchFilters, facets: Facets) {
  const chips: { key: string; label: string; remove: Partial<SearchFilters> }[] = [];
  const add = (key: keyof SearchFilters, label: string) => chips.push({ key, label, remove: { [key]: undefined } });
  if (f.q) add("q", `“${f.q}”`);
  if (f.category) add("category", CATEGORY_OPTIONS[f.category]);
  if (f.type) add("type", PROPERTY_TYPE_LABEL[f.type]);
  if (f.location) add("location", facets.locations.find((l) => l.slug === f.location)?.name ?? f.location);
  if (f.minPrice !== undefined) add("minPrice", `From ${formatPrice(f.minPrice)}`);
  if (f.maxPrice !== undefined) add("maxPrice", `Up to ${formatPrice(f.maxPrice)}`);
  if (f.minLand !== undefined) add("minLand", `Land ≥ ${formatArea(f.minLand)}`);
  if (f.maxLand !== undefined) add("maxLand", `Land ≤ ${formatArea(f.maxLand)}`);
  if (f.minBuilt !== undefined) add("minBuilt", `Built-up ≥ ${formatArea(f.minBuilt)}`);
  if (f.maxBuilt !== undefined) add("maxBuilt", `Built-up ≤ ${formatArea(f.maxBuilt)}`);
  if (f.beds) add("beds", `${f.beds}+ bedrooms`);
  if (f.availability) add("availability", AVAILABILITY_OPTIONS[f.availability]);
  if (f.projectStatus) add("projectStatus", `${PROJECT_STATUS_LABEL[f.projectStatus]} project`);
  for (const a of f.amenities ?? []) {
    chips.push({
      key: `amenity-${a}`,
      label: facets.amenities.find((x) => x.slug === a)?.name ?? a,
      remove: { amenities: (f.amenities ?? []).filter((x) => x !== a) },
    });
  }
  return chips;
}
