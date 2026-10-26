import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { PropertyCard } from "@/components/property/PropertyCard";
import { InventorySkyline } from "@/components/site/brand/InventorySkyline";
import { FeaturedShowcase, type ShowcaseItem } from "@/components/site/brand/FeaturedShowcase";
import { Journey } from "@/components/site/brand/Journey";
import { LeafWave } from "@/components/site/brand/LeafWave";
import { PlotExplorer } from "@/components/site/brand/PlotExplorer";
import { Illustration } from "@/components/site/Illustration";
import { Media } from "@/components/site/Media";
import { JsonLd, ProjectStatusBadge, SampleTag } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { db } from "@/lib/db";
import { getFeaturedProperties, getPublishedProjects, getSearchFacets } from "@/lib/queries";
import { BUDGETS } from "@/lib/search";
import { getSettings, officeAddress } from "@/lib/settings";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { absolute: t.home.metaTitle }, description: t.home.metaDescription, alternates: await alternates("/") };
}

const OPEN = { in: ["AVAILABLE", "RESERVED"] } as { in: ("AVAILABLE" | "RESERVED")[] };

export default async function HomePage() {
  const { t, f, href, locale } = await getI18n();
  const h = t.home;
  const [settings, featured, projects, facets, counts, explorerRows, byLocation] = await Promise.all([
    getSettings(),
    getFeaturedProperties(6),
    getPublishedProjects(),
    getSearchFacets(),
    Promise.all([
      db.property.count({ where: { publication: "PUBLISHED", type: { in: ["RESIDENTIAL_PLOT", "LAND"] }, availability: OPEN } }),
      db.property.count({ where: { publication: "PUBLISHED", type: { in: ["HOUSE", "VILLA"] }, availability: OPEN } }),
    ]),
    db.property.findMany({
      where: { publication: "PUBLISHED", type: { in: ["RESIDENTIAL_PLOT", "LAND"] }, availability: { in: ["AVAILABLE", "RESERVED", "SOLD"] } },
      orderBy: [{ availability: "asc" }, { publishedAt: "desc" }],
      take: 12,
    }),
    db.location.findMany({
      where: { properties: { some: { publication: "PUBLISHED", availability: OPEN } } },
      select: { name: true, slug: true, _count: { select: { properties: { where: { publication: "PUBLISHED", availability: OPEN } } } } },
    }),
  ]);
  const explorer = explorerRows.map((r) => ({
    slug: r.slug,
    title: r.title,
    ref: r.referenceCode,
    area: r.landAreaLabel ?? (r.landAreaSqft ? f.area(r.landAreaSqft) : null),
    dims: r.plotDimensions,
    facing: r.facing,
    road: r.accessRoad,
    price: r.publicPrice === null ? null : f.price(Number(r.publicPrice)),
    availability: r.availability,
    sample: r.isSample,
  }));
  const skyline = byLocation
    .map((l) => ({ label: l.name.replace(/\s*\(sample\)/i, ""), count: l._count.properties, href: `/properties?location=${l.slug}` }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const [plotCount, homeCount] = counts;
  // Hero slideshow: up to four featured listings that are still on offer.
  const showcase: ShowcaseItem[] = featured
    .filter((p) => p.availability === "AVAILABLE" || p.availability === "RESERVED")
    .slice(0, 4)
    .map((p) => {
      const home = p.type === "HOUSE" || p.type === "VILLA";
      const facts = home
        ? [p.bedrooms ? `${p.bedrooms} ${t.facts.bedrooms.toLocaleLowerCase()}` : null, p.builtUpAreaSqft ? f.area(p.builtUpAreaSqft) : null]
        : [p.landAreaLabel ?? (p.landAreaSqft ? f.area(p.landAreaSqft) : null), p.plotDimensions];
      return {
        slug: p.slug,
        ref: p.referenceCode,
        title: p.title,
        type: t.labels.propertyType[p.type],
        place: p.localityLabel ?? p.location?.name ?? null,
        facts: facts.filter((x): x is string => !!x),
        price: p.price !== null ? f.price(p.price) : t.price.onRequest,
        availability: p.availability,
        sample: p.isSample,
        image: p.image,
      };
    });
  const address = officeAddress(settings);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: settings.businessName,
          slogan: "Build better from now",
          url: absoluteUrl(href("/")),
          inLanguage: locale === "ta" ? "ta-IN" : "en-IN",
          ...(settings.phone && { telephone: settings.phone }),
          ...(settings.email && { email: settings.email }),
          ...(address && { address: { "@type": "PostalAddress", streetAddress: settings.addressLine, addressLocality: settings.city, addressRegion: settings.state, postalCode: settings.postalCode, addressCountry: "IN" } }),
          ...(settings.socialLinks.length && { sameAs: settings.socialLinks.map((s) => s.url) }),
        }}
      />

      {/* A — Hero: a calm headline beside a real featured listing. */}
      <section aria-labelledby="hero-h">
        <div className="wrap grid gap-10 pb-10 pt-10 lg:grid-cols-12 lg:items-stretch lg:gap-12 lg:pb-24 lg:pt-14">
          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="annot text-emerald">{h.hero.eyebrow}</p>
            <h1 id="hero-h" className="mt-6 text-headline text-navy lg:text-[clamp(2.6rem,1.4rem+2.6vw,4.4rem)] lg:leading-[1.04]">{h.hero.title}</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate">{h.hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/properties" className="btn btn-primary">{h.hero.explore}</Link>
              <Link href="/construction" className="btn btn-outline text-navy">{h.hero.build}</Link>
            </div>
            {(plotCount > 0 || homeCount > 0 || facets.locations.length > 0) && (
              <dl className="mt-12 grid max-w-md grid-cols-3 border-t border-line pt-6">
                {([[plotCount, h.hero.stats.plots, "/plots"], [homeCount, h.hero.stats.homes, "/houses"], [facets.locations.length, h.hero.stats.locations, "/properties"]] as const).map(([value, label, to]) => (
                  <div key={label} className="pr-4">
                    <dt className="text-xs text-slate">{label}</dt>
                    <dd className="mt-1"><Link href={to} className="font-serif text-3xl text-navy hover:text-emerald">{value}</Link></dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="min-h-[26rem] lg:col-span-7 lg:min-h-[min(74svh,44rem)]">
            <FeaturedShowcase items={showcase} />
          </div>
        </div>
        <div className="wrap">
          {/* Search: a plain ruled form strip. */}
          <form
            action={href("/properties")}
            method="get"
            role="search"
            aria-label={h.search.label}
            className="print-card grid gap-0 p-1.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <label className="search-cell">
              <span className="annot-plain text-slate">{h.search.type}</span>
              <select name="category" defaultValue="">
                <option value="">{h.search.anyType}</option>
                <option value="land">{h.search.land}</option>
                <option value="homes">{h.search.homes}</option>
                <option value="project">{h.search.project}</option>
              </select>
            </label>
            <label className="search-cell">
              <span className="annot-plain text-slate">{h.search.location}</span>
              <select name="location" defaultValue="">
                <option value="">{h.search.anyLocation}</option>
                {facets.locations.map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </select>
            </label>
            <label className="search-cell">
              <span className="annot-plain text-slate">{h.search.budget}</span>
              <select name="maxPrice" defaultValue="" disabled={!facets.hasPrices}>
                <option value="">{h.search.anyBudget}</option>
                {BUDGETS.map(([v]) => (
                  <option key={v} value={v}>{h.search.upTo(f.price(v))}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-gold min-h-14 sm:col-span-2 lg:col-span-1 lg:px-8">{h.search.submit}</button>
          </form>
        </div>
      </section>

      {/* B — Discovery */}
      <section className="py-20 lg:py-28" aria-labelledby="discover-h">
        <div className="wrap">
          <div className="grid gap-6 lg:grid-cols-12" data-reveal>
            <p className="annot text-emerald lg:col-span-3 lg:pt-4">{h.discover.eyebrow}</p>
            <h2 id="discover-h" className="text-headline text-navy lg:col-span-7">{h.discover.title}</h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
            <Link href="/plots" className="group relative flex min-h-[22rem] overflow-hidden rounded-[1.25rem] bg-forest text-ivory lg:col-span-8" data-reveal>
              <div className="absolute inset-0 opacity-90 transition-transform duration-700 group-hover:scale-[1.03]">
                <Illustration variant="site-plan" tone="forest" label={false} />
              </div>
              <div className="relative mt-auto w-full bg-gradient-to-t from-forest via-forest/85 to-transparent p-6 pt-24 sm:p-8">
                <p className="annot text-gold-light">{plotCount ? h.discover.listed(plotCount) : h.discover.plotsTag}</p>
                <h3 className="mt-3 text-4xl">{h.discover.plotsTitle}</h3>
                <p className="mt-2 max-w-md text-ivory/80">{h.discover.plotsBody}</p>
                <span className="link-arrow mt-5 text-gold-light">{h.discover.plotsCta}</span>
              </div>
            </Link>
            <Link href="/houses" className="surface group flex flex-col overflow-hidden p-2 lg:col-span-4 lg:row-span-2" data-reveal>
              <div className="blob-mask relative aspect-[3/4] lg:aspect-auto lg:flex-1">
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
                  <Illustration variant="elevation" tone="ivory" label={false} />
                </div>
              </div>
              <div className="p-5">
                <p className="annot text-emerald">{homeCount ? h.discover.listed(homeCount) : h.discover.homesTag}</p>
                <h3 className="mt-3 text-3xl text-navy">{h.discover.homesTitle}</h3>
                <span className="link-arrow mt-4 text-emerald">{h.discover.homesCta}</span>
              </div>
            </Link>
            <Link href="/projects/ongoing" className="group survey-grid relative flex flex-col justify-between gap-10 overflow-hidden rounded-[1.25rem] bg-navy p-6 text-ivory sm:flex-row sm:items-end sm:p-8 lg:col-span-8" data-reveal>
              <div className="relative">
                <p className="annot text-gold">{projects.length ? h.discover.devCount(projects.length) : h.discover.devTag}</p>
                <h3 className="mt-3 text-4xl">{h.discover.devTitle}</h3>
                <p className="mt-2 max-w-md text-ivory/80">{h.discover.devBody}</p>
              </div>
              <span className="link-arrow relative shrink-0 text-gold">{h.discover.devCta}</span>
            </Link>
          </div>

          {skyline.length > 0 && (
            <div className="mt-20 grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-4" data-reveal>
                <p className="annot text-gold-deep">{h.discover.skyEyebrow}</p>
                <h3 className="mt-4 text-4xl text-navy">{h.discover.skyTitle}</h3>
                <p className="mt-3 text-slate">{h.discover.skyBody}</p>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <InventorySkyline bars={skyline} />
              </div>
            </div>
          )}
        </div>
      </section>

      <Journey />

      {/* C — Featured */}
      <section className="py-20 lg:py-28" aria-labelledby="featured-h">
        <div className="wrap">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" data-reveal>
            <div>
              <p className="annot text-emerald">{h.featured.eyebrow}</p>
              <h2 id="featured-h" className="mt-4 text-headline text-navy">{h.featured.title}</h2>
            </div>
            <nav aria-label={h.featured.filterLabel} className="flex flex-wrap items-center gap-2">
              {([["/plots", h.featured.plots], ["/houses", h.featured.houses], ["/properties?availability=available", h.featured.availableNow]] as const).map(([to, label]) => (
                <Link key={to} href={to} className="chip-liquid">{label}</Link>
              ))}
              <Link href="/properties" className="btn btn-primary ml-2 min-h-10">{h.featured.viewAll}</Link>
            </nav>
          </div>
          {featured.length ? (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <li key={p.id} data-reveal>
                  <PropertyCard p={p} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-12 rounded-[1.25rem] border border-dashed border-line bg-white/70 p-10 text-center">
              <p className="font-serif text-2xl text-navy">{h.featured.emptyTitle}</p>
              <p className="mt-2 text-slate">{h.featured.emptyBody}</p>
              <Link href="/contact#enquire" className="btn btn-primary mt-6">{h.featured.emptyCta}</Link>
            </div>
          )}
        </div>
      </section>

      {/* D — Land perspective */}
      <LeafWave from="#FDFAF3" to="#0C3F19" />
      <section className="survey-grid relative overflow-hidden bg-forest pb-20 pt-12 text-ivory lg:pb-28" aria-labelledby="land-h">
        <div className="wrap relative">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end" data-reveal>
            <div className="lg:col-span-6">
              <p className="annot text-gold-light">{h.land.eyebrow}</p>
              <h2 id="land-h" className="mt-5 text-headline">{h.land.title}</h2>
            </div>
            <p className="text-lg leading-relaxed text-ivory/80 lg:col-span-5 lg:col-start-8">{h.land.body}</p>
          </div>

          <div className="mt-12">
            {explorer.length > 0 ? (
              <PlotExplorer plots={explorer} />
            ) : (
              <p className="rounded-[1.25rem] border border-dashed border-ivory/30 p-8 text-ivory/80">{h.land.empty}</p>
            )}
          </div>

          <div className="mt-14 grid gap-10 border-t border-ivory/15 pt-10 lg:grid-cols-12">
            <p className="annot text-gold-light lg:col-span-3">{h.land.recordsTitle}</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-9">
              {h.land.records.map(([k, v], i) => (
                <li key={k} className="rounded-[1.5rem] bg-ivory/[0.06] p-4 ring-1 ring-ivory/10 transition-colors hover:bg-ivory/[0.1]" data-reveal style={{ animationDelay: `${i * 40}ms` }}>
                  <p className="font-serif text-xl">{k}</p>
                  <p className="mt-1 text-sm text-ivory/70">{v}</p>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/plots" className="btn btn-gold mt-12">{h.land.cta}</Link>
        </div>
      </section>
      <LeafWave from="#0C3F19" to="#FDFAF3" flip />

      {/* E — Homes & construction */}
      <section className="wrap grid gap-10 py-20 lg:grid-cols-2 lg:items-center lg:py-28" aria-labelledby="build-h">
        <div className="blob-mask liquid-float relative min-h-[22rem] lg:min-h-[36rem]" data-reveal="clip">
          <Media src={settings.homesImageUrl ?? "placeholder:construction"} alt={settings.homesImageAlt ?? h.build.imageAlt} sizes="(min-width:1024px) 50vw, 100vw" tone="navy" />
        </div>
        <div className="max-w-xl" data-reveal>
          <p className="annot text-emerald">{h.build.eyebrow}</p>
          <h2 id="build-h" className="mt-5 text-headline text-navy">{h.build.title}</h2>
          <p className="mt-6 text-lg leading-relaxed text-slate">{settings.constructionNotes ?? h.build.fallback}</p>
          {settings.constructionServices.length > 0 && (
            <ul className="mt-8 space-y-2">
              {settings.constructionServices.map((s) => (
                <li key={s.title} className="surface flex gap-4 px-5 py-4">
                  <span className="mt-1.5 h-3 w-3 shrink-0 rotate-45 bg-gold" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-ink">{s.title}</p>
                    <p className="mt-1 text-sm text-slate">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/construction" className="btn btn-primary mt-10">{h.build.cta}</Link>
        </div>
      </section>

      {/* F — Projects */}
      <section className="pb-20 lg:pb-28" aria-labelledby="projects-h">
        <div className="wrap">
          <div className="grid gap-6 lg:grid-cols-12" data-reveal>
            <p className="annot text-emerald lg:col-span-3 lg:pt-4">{h.projects.eyebrow}</p>
            <h2 id="projects-h" className="text-headline text-navy lg:col-span-7">{h.projects.title}</h2>
          </div>
          {projects.length ? (
            <ul className="mt-14 space-y-16">
              {projects.slice(0, 3).map((pr, i) => (
                <li key={pr.id} className="grid gap-8 lg:grid-cols-12 lg:items-end" data-reveal>
                  <Link href={`/projects/${pr.slug}`} className={`blob-mask group relative block aspect-[16/10] lg:col-span-7 ${i % 2 ? "lg:order-2 lg:col-start-6" : ""}`}>
                    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]">
                      <Media src={pr.images[0]?.url} alt={pr.images[0]?.alt ?? pr.name} sizes="(min-width:1024px) 58vw, 100vw" />
                    </div>
                  </Link>
                  <div className={`lg:col-span-4 ${i % 2 ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectStatusBadge value={pr.status} />
                      {pr.isSample && <SampleTag />}
                    </div>
                    <p className="annot-plain mt-4 text-slate">{pr.localityLabel ?? pr.location?.name}</p>
                    <h3 className="mt-2 text-3xl text-navy">{pr.name}</h3>
                    {pr.summary && <p className="mt-3 text-slate">{pr.summary}</p>}
                    <Link href={`/projects/${pr.slug}`} className="link-arrow mt-6 text-emerald">{h.projects.details}</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-12 grid gap-8 border-t border-line pt-10 lg:grid-cols-12">
              <p className="font-serif text-3xl text-navy lg:col-span-7">{h.projects.emptyTitle}</p>
              <div className="lg:col-span-4 lg:col-start-9">
                <p className="text-slate">{h.projects.emptyBody}</p>
                <Link href="/contact#enquire" className="link-arrow mt-5 text-emerald">{h.projects.emptyCta}</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* G — Why */}
      {settings.strengths.length > 0 && (
        <section className="pb-20 lg:pb-28" aria-labelledby="why-h">
          <div className="wrap grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4" data-reveal>
              <p className="annot text-emerald">{h.why.eyebrow(settings.businessName)}</p>
              <h2 id="why-h" className="mt-5 text-headline text-navy">{h.why.title}</h2>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
              {settings.strengths.map((s, i) => (
                <li key={s.title} className="surface p-6" data-reveal>
                  <span className="font-mono text-sm text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-2xl text-ink">{s.title}</h3>
                  <p className="mt-2 text-slate">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* H — Enquiry */}
      <section className="px-2 pb-2 sm:px-4" aria-labelledby="enquire-h" id="enquire">
        <div className="grid overflow-hidden rounded-[1.5rem] bg-paper lg:grid-cols-12 sm:rounded-[1.5rem]">
          <div className="relative bg-navy lg:col-span-5">
            <div className="relative min-h-[18rem] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
              <Media src={settings.enquiryImageUrl ?? "placeholder:villa"} alt={settings.enquiryImageAlt ?? h.enquire.imageAlt} sizes="(min-width:1024px) 42vw, 100vw" tone="navy" />
            </div>
          </div>
          <div className="px-4 py-16 sm:px-10 lg:col-span-7 lg:px-16 lg:py-24">
            <p className="annot text-emerald">{h.enquire.eyebrow}</p>
            <h2 id="enquire-h" className="mt-5 max-w-2xl text-headline text-navy">{h.enquire.title}</h2>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label={h.enquire.waysLabel}>
              {h.enquire.ways.map(([l, to]) => (
                <li key={to}>
                  <Link href={to} className="chip-liquid">{l}</Link>
                </li>
              ))}
            </ul>
            <ol className="mt-10 grid gap-3 text-sm text-slate sm:grid-cols-3">
              {h.enquire.steps.map(([k, v]) => (
                <li key={k} className="rounded-[1.5rem] bg-white/70 p-4"><span className="annot-plain block text-gold-deep">{k}</span>{v}</li>
              ))}
            </ol>
            <div className="surface mt-10 max-w-2xl p-6 sm:p-8">
              <EnquiryForm chooseType businessName={settings.businessName} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
