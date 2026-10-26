import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { PropertyCard } from "@/components/property/PropertyCard";
import { InventorySkyline } from "@/components/site/brand/InventorySkyline";
import { Journey } from "@/components/site/brand/Journey";
import { LeafWave } from "@/components/site/brand/LeafWave";
import { PlotExplorer } from "@/components/site/brand/PlotExplorer";
import { RotatingWords } from "@/components/site/brand/RotatingWords";
import { SunriseScene } from "@/components/site/brand/SunriseScene";
import { Illustration } from "@/components/site/Illustration";
import { Media } from "@/components/site/Media";
import { JsonLd, ProjectStatusBadge, SampleTag } from "@/components/site/ui";
import { db } from "@/lib/db";
import { formatArea, formatPrice } from "@/lib/format";
import { getFeaturedProperties, getPublishedProjects, getSearchFacets } from "@/lib/queries";
import { getSettings, officeAddress } from "@/lib/settings";
import { BUDGETS } from "@/lib/search";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "V D Properties — Residential Plots, Land & Homes" },
  description: "Discover residential land, thoughtfully developed properties and homes designed around the way you want to live. Build better from now.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [settings, featured, projects, facets, counts, explorerRows, byLocation] = await Promise.all([
    getSettings(),
    getFeaturedProperties(6),
    getPublishedProjects(),
    getSearchFacets(),
    Promise.all([
      db.property.count({ where: { publication: "PUBLISHED", type: { in: ["RESIDENTIAL_PLOT", "LAND"] }, availability: { in: ["AVAILABLE", "RESERVED"] } } }),
      db.property.count({ where: { publication: "PUBLISHED", type: { in: ["HOUSE", "VILLA"] }, availability: { in: ["AVAILABLE", "RESERVED"] } } }),
    ]),
    db.property.findMany({
      where: { publication: "PUBLISHED", type: { in: ["RESIDENTIAL_PLOT", "LAND"] }, availability: { in: ["AVAILABLE", "RESERVED", "SOLD"] } },
      orderBy: [{ availability: "asc" }, { publishedAt: "desc" }],
      take: 12,
    }),
    db.location.findMany({
      where: { properties: { some: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } } } },
      select: { name: true, slug: true, _count: { select: { properties: { where: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] } } } } } },
    }),
  ]);
  const explorer = explorerRows.map((r) => ({
    slug: r.slug,
    title: r.title,
    ref: r.referenceCode,
    area: r.landAreaLabel ?? (r.landAreaSqft ? formatArea(r.landAreaSqft) : null),
    dims: r.plotDimensions,
    facing: r.facing,
    road: r.accessRoad,
    price: r.publicPrice === null ? null : formatPrice(Number(r.publicPrice)),
    availability: r.availability,
    sample: r.isSample,
  }));
  const skyline = byLocation
    .map((l) => ({ label: l.name.replace(/\s*\(sample\)/i, ""), count: l._count.properties, href: `/properties?location=${l.slug}` }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const [plotCount, homeCount] = counts;
  const address = officeAddress(settings);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: settings.businessName,
          slogan: "Build better from now",
          url: absoluteUrl("/"),
          ...(settings.phone && { telephone: settings.phone }),
          ...(settings.email && { email: settings.email }),
          ...(address && { address: { "@type": "PostalAddress", streetAddress: settings.addressLine, addressLocality: settings.city, addressRegion: settings.state, postalCode: settings.postalCode, addressCountry: "IN" } }),
          ...(settings.socialLinks.length && { sameAs: settings.socialLinks.map((s) => s.url) }),
        }}
      />

      {/* A — Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-20 h-[30rem] w-[30rem] rounded-full bg-sun-light/20 blur-3xl" aria-hidden="true" />
        <div className="wrap grid gap-6 pt-10 lg:grid-cols-12 lg:gap-8 lg:pt-14">
          <div className="relative z-10 flex flex-col justify-center lg:col-span-5 lg:pb-32" data-reveal>
            <p className="annot text-emerald">Land. Homes. Possibilities.</p>
            <h1 className="mt-6 text-display text-navy">
              A better place to begin your{" "}
              <em>
                {/* Solid colour: background-clip gradients ignore the per-word opacity animation in Chrome */}
                <RotatingWords words={["next chapter.", "first home.", "own plot.", "family home."]} wordClassName="text-terracotta" />
              </em>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate">
              Discover residential land, thoughtfully developed properties, and homes designed around the way you want to live.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/properties" className="btn btn-primary">Explore Properties</Link>
              <Link href="/construction" className="btn btn-gold">Build With Us</Link>
            </div>
          </div>
          <div className="relative -mx-4 sm:mx-0 lg:col-span-7">
            <div className="relative aspect-[4/3] lg:aspect-auto lg:h-[min(78vh,48rem)]">
              <SunriseScene photo={settings.heroImageUrl} photoAlt={settings.heroImageAlt} />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="wrap relative z-10 -mt-6 lg:-mt-12">
          <form action="/properties" method="get" role="search" aria-label="Search properties" className="grid gap-4 border border-line bg-white p-5 shadow-[0_30px_60px_-40px_rgba(16,44,74,0.5)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end lg:p-6">
            <div>
              <label htmlFor="hs-type" className="annot-plain mb-2 block text-slate">Property type</label>
              <select id="hs-type" name="category" className="field" defaultValue="">
                <option value="">Any type</option>
                <option value="land">Residential plots & land</option>
                <option value="homes">Houses & villas</option>
                <option value="project">In a development</option>
              </select>
            </div>
            <div>
              <label htmlFor="hs-loc" className="annot-plain mb-2 block text-slate">Preferred location</label>
              <select id="hs-loc" name="location" className="field" defaultValue="">
                <option value="">Any location</option>
                {facets.locations.map((l) => (
                  <option key={l.slug} value={l.slug}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hs-budget" className="annot-plain mb-2 block text-slate">Budget range</label>
              <select id="hs-budget" name="maxPrice" className="field" defaultValue="" disabled={!facets.hasPrices}>
                <option value="">Any budget</option>
                {BUDGETS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-gold sm:col-span-2 lg:col-span-1">Search properties</button>
          </form>
        </div>
      </section>

      {/* B — Discovery */}
      <section className="py-20 lg:py-28" aria-labelledby="discover-h">
        <div className="wrap">
          <div className="grid gap-6 lg:grid-cols-12" data-reveal>
            <p className="annot text-emerald lg:col-span-3 lg:pt-4">01 — Discover</p>
            <h2 id="discover-h" className="text-headline text-navy lg:col-span-7">Find the right place for what comes next.</h2>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
            <Link href="/plots" className="group relative flex min-h-[22rem] overflow-hidden bg-forest text-ivory lg:col-span-8" data-reveal>
              <div className="absolute inset-0 opacity-90 transition-transform duration-700 group-hover:scale-[1.02]">
                <Illustration variant="site-plan" tone="forest" label={false} />
              </div>
              <div className="relative mt-auto w-full bg-gradient-to-t from-forest via-forest/85 to-transparent p-6 pt-24 sm:p-8">
                <p className="annot text-gold-light">{plotCount ? `${plotCount} listed` : "Plots & land"}</p>
                <h3 className="mt-3 text-4xl">Residential Land & Plots</h3>
                <p className="mt-2 max-w-md text-ivory/80">Plots and land parcels with their dimensions, access and infrastructure recorded.</p>
                <span className="link-arrow mt-5 text-gold-light">Explore plots</span>
              </div>
            </Link>
            <Link href="/houses" className="group flex flex-col lg:col-span-4 lg:row-span-2" data-reveal>
              <div className="relative aspect-[3/4] overflow-hidden lg:aspect-auto lg:flex-1">
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.03]">
                  <Illustration variant="elevation" tone="ivory" label={false} />
                </div>
              </div>
              <div className="border-x border-b border-line bg-white p-6">
                <p className="annot text-emerald">{homeCount ? `${homeCount} listed` : "Completed homes"}</p>
                <h3 className="mt-3 text-3xl text-navy">Houses & Villas</h3>
                <span className="link-arrow mt-4 text-emerald">See homes</span>
              </div>
            </Link>
            <Link href="/projects/ongoing" className="group survey-grid relative flex flex-col justify-between gap-10 bg-navy p-6 text-ivory sm:flex-row sm:items-end sm:p-8 lg:col-span-8" data-reveal>
              <div>
                <p className="annot text-gold">{projects.length ? `${projects.length} project${projects.length > 1 ? "s" : ""}` : "Developments"}</p>
                <h3 className="mt-3 text-4xl">New Developments</h3>
                <p className="mt-2 max-w-md text-ivory/80">Layouts and housing projects we are developing, with their current status.</p>
              </div>
              <span className="link-arrow shrink-0 text-gold">View projects</span>
            </Link>
          </div>

          {skyline.length > 0 && (
            <div className="mt-20 grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-4" data-reveal>
                <p className="annot text-gold-deep">Live inventory</p>
                <h3 className="mt-4 text-4xl text-navy">A skyline of what's open now.</h3>
                <p className="mt-3 text-slate">Each building is a location; its height is the number of available or reserved listings there today. Tap one to see them.</p>
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
      <section className="border-t border-line bg-paper py-20 lg:py-28" aria-labelledby="featured-h">
        <div className="wrap">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" data-reveal>
            <div>
              <p className="annot text-emerald">02 — Selected listings</p>
              <h2 id="featured-h" className="mt-4 text-headline text-navy">Featured properties</h2>
            </div>
            <nav aria-label="Filter featured properties" className="flex flex-wrap items-center gap-2">
              <Link href="/plots" className="border border-line bg-white px-4 py-2 text-sm font-medium hover:border-emerald">Plots & land</Link>
              <Link href="/houses" className="border border-line bg-white px-4 py-2 text-sm font-medium hover:border-emerald">Houses & villas</Link>
              <Link href="/properties?availability=available" className="border border-line bg-white px-4 py-2 text-sm font-medium hover:border-emerald">Available now</Link>
              <Link href="/properties" className="btn btn-primary ml-2 min-h-10">View All Properties</Link>
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
            <div className="mt-12 border border-dashed border-line bg-white p-10 text-center">
              <p className="font-serif text-2xl text-navy">New listings are being prepared.</p>
              <p className="mt-2 text-slate">Tell us what you're looking for and we'll contact you when something suitable is available.</p>
              <Link href="/contact#enquire" className="btn btn-primary mt-6">Tell us what you need</Link>
            </div>
          )}
        </div>
      </section>

      {/* D — Land perspective */}
      <LeafWave from="#F5EFE1" to="#0C3F19" />
      <section className="survey-grid relative overflow-hidden bg-forest pb-20 pt-12 text-ivory lg:pb-28" aria-labelledby="land-h">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-terracotta/25 blur-3xl" aria-hidden="true" />
        <div className="wrap relative">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end" data-reveal>
            <div className="lg:col-span-6">
              <p className="annot text-gold-light">03 — The land perspective</p>
              <h2 id="land-h" className="mt-5 text-headline">Know the ground before you decide.</h2>
            </div>
            <p className="text-lg leading-relaxed text-ivory/80 lg:col-span-5 lg:col-start-8">
              A plot is more than its price. Explore the layout below — every parcel is a real listing, showing only the details that have been recorded and verified.
            </p>
          </div>

          <div className="mt-12">
            {explorer.length > 0 ? (
              <PlotExplorer plots={explorer} />
            ) : (
              <p className="border border-dashed border-ivory/30 p-8 text-ivory/80">Plot listings will appear on this layout as they're published.</p>
            )}
          </div>

          <div className="mt-14 grid gap-10 border-t border-ivory/15 pt-10 lg:grid-cols-12">
            <p className="annot text-gold-light lg:col-span-3">What every plot records</p>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:col-span-9">
              {[
                ["Plot dimensions", "Frontage and depth as surveyed"],
                ["Land area", "In sq ft, with local units where used"],
                ["Road access", "Width and type of the approach road"],
                ["Infrastructure", "Water, power, drainage — when verified"],
                ["Development status", "Where the layout's works stand"],
                ["Approved layout", "Only with documents to support it"],
              ].map(([k, v], i) => (
                <li key={k} className="border-l-2 border-gold pl-4" data-reveal style={{ animationDelay: `${i * 40}ms` }}>
                  <p className="font-serif text-xl">{k}</p>
                  <p className="mt-1 text-sm text-ivory/70">{v}</p>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/plots" className="btn btn-gold mt-12">Explore Available Plots</Link>
        </div>
      </section>
      <LeafWave from="#0C3F19" to="#FDFAF3" flip />

      {/* E — Homes & construction */}
      <section className="grid lg:grid-cols-2" aria-labelledby="build-h">
        <div className="relative min-h-[22rem] lg:min-h-[40rem]" data-reveal="clip">
          <Media src={settings.homesImageUrl ?? "placeholder:construction"} alt={settings.homesImageAlt ?? "Line drawing of a house under construction"} sizes="(min-width:1024px) 50vw, 100vw" tone="navy" />
        </div>
        <div className="flex items-center bg-ivory">
          <div className="max-w-xl px-4 py-16 sm:px-12 lg:py-24" data-reveal>
            <p className="annot text-emerald">04 — Homes & construction</p>
            <h2 id="build-h" className="mt-5 text-headline text-navy">From a piece of land to a place of your own.</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate">
              {settings.constructionNotes ?? "We build homes as well as sell land — so the plot you choose and the house you want can be planned together."}
            </p>
            {settings.constructionServices.length > 0 && (
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {settings.constructionServices.map((s) => (
                  <li key={s.title} className="flex gap-4 py-4">
                    <span className="mt-2 h-2 w-2 shrink-0 bg-gold" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-sm text-slate">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/construction" className="btn btn-primary mt-10">Discover Our Construction Services</Link>
          </div>
        </div>
      </section>

      {/* F — Projects */}
      <section className="py-20 lg:py-28" aria-labelledby="projects-h">
        <div className="wrap">
          <div className="grid gap-6 lg:grid-cols-12" data-reveal>
            <p className="annot text-emerald lg:col-span-3 lg:pt-4">05 — Developments</p>
            <h2 id="projects-h" className="text-headline text-navy lg:col-span-7">Projects, ongoing and delivered.</h2>
          </div>
          {projects.length ? (
            <ul className="mt-14 space-y-16">
              {projects.slice(0, 3).map((pr, i) => (
                <li key={pr.id} className="grid gap-8 lg:grid-cols-12 lg:items-end" data-reveal>
                  <Link href={`/projects/${pr.slug}`} className={`group relative block aspect-[16/10] overflow-hidden lg:col-span-7 ${i % 2 ? "lg:order-2 lg:col-start-6" : ""}`}>
                    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02]">
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
                    <Link href={`/projects/${pr.slug}`} className="link-arrow mt-6 text-emerald">Project details</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-12 grid gap-8 border-t border-line pt-10 lg:grid-cols-12">
              <p className="font-serif text-3xl text-navy lg:col-span-7">Our development portfolio will be published here as projects are confirmed.</p>
              <div className="lg:col-span-4 lg:col-start-9">
                <p className="text-slate">Interested in an upcoming project? Tell us what you're looking for and we'll keep you informed.</p>
                <Link href="/contact#enquire" className="link-arrow mt-5 text-emerald">Enquire about developments</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* G — Why */}
      {settings.strengths.length > 0 && (
        <section className="border-t border-line bg-white py-20 lg:py-28" aria-labelledby="why-h">
          <div className="wrap grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4" data-reveal>
              <p className="annot text-emerald">06 — Why {settings.businessName}</p>
              <h2 id="why-h" className="mt-5 text-headline text-navy">How we work with you.</h2>
            </div>
            <ol className="lg:col-span-7 lg:col-start-6">
              {settings.strengths.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-line py-7 last:border-b" data-reveal>
                  <span className="font-mono text-sm text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-2xl text-ink">{s.title}</h3>
                    <p className="mt-2 text-slate">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* H — Enquiry */}
      <section className="bg-paper" aria-labelledby="enquire-h" id="enquire">
        <div className="grid lg:grid-cols-12">
          <div className="bg-navy lg:col-span-5">
            <div className="relative min-h-[18rem] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
              <Media src={settings.enquiryImageUrl ?? "placeholder:villa"} alt={settings.enquiryImageAlt ?? "Line drawing of a villa at sunrise"} sizes="(min-width:1024px) 42vw, 100vw" tone="navy" />
            </div>
          </div>
          <div className="px-4 py-16 sm:px-10 lg:col-span-7 lg:px-16 lg:py-24">
            <p className="annot text-emerald">07 — Start here</p>
            <h2 id="enquire-h" className="mt-5 max-w-2xl text-headline text-navy">Your next property decision starts with a conversation.</h2>
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Ways to get in touch">
              {[
                ["Find a property", "/properties"],
                ["Enquire about a plot", "/plots"],
                ["Discuss a house", "/houses"],
                ["Request a site visit", "/site-visit"],
                ["Discuss a construction project", "/construction#enquire"],
              ].map(([l, h]) => (
                <li key={h}>
                  <Link href={h} className="inline-block border border-navy/30 px-4 py-2 text-sm font-medium text-navy hover:border-emerald hover:text-emerald">{l}</Link>
                </li>
              ))}
            </ul>
            <ol className="mt-10 grid gap-4 border-y border-line py-6 text-sm text-slate sm:grid-cols-3">
              <li><span className="annot-plain block text-gold-deep">Step 1</span>You send a short enquiry.</li>
              <li><span className="annot-plain block text-gold-deep">Step 2</span>Our team calls you to understand what you need.</li>
              <li><span className="annot-plain block text-gold-deep">Step 3</span>We share suitable options or arrange a site visit.</li>
            </ol>
            <div className="mt-10 max-w-2xl">
              <EnquiryForm chooseType businessName={settings.businessName} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
