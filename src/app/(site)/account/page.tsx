import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";
import { logoutCustomer } from "@/app/account/_actions/auth";
import { deleteScenario, deleteSearch, toggleSearchAlerts } from "@/app/account/_actions/customer";
import { AlertConsentForm } from "@/components/account/AuthForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { criteriaToQuery, type Criteria } from "@/lib/plotfit";
import { scenarioNote, scenarioStatus, studioHref, type ScenarioResult } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.dash.meta, robots: { index: false } };
}

export default async function AccountPage() {
  const me = await requireCustomerPage("/account");
  const { t, f } = await getI18n();
  const d = t.account.dash;
  const [listings, purchases] = await Promise.all([
    db.property.findMany({ where: { sellerId: me.id, source: "OWNER" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, referenceCode: true, title: true, submissionStatus: true, publication: true } }),
    db.purchaseRequest.findMany({ where: { buyerId: me.id }, orderBy: { createdAt: "desc" }, take: 20, include: { property: { select: { slug: true, publication: true } } } }),
  ]);
  const mk = t.market;
  const [user, saved, scenarios, searches, enquiries, visits, projects] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true, email: true, marketingConsent: true } }),
    db.savedProperty.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, include: { property: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, location: true } } } }),
    db.planningScenario.findMany({ where: { userId: me.id }, orderBy: { updatedAt: "desc" }, include: { property: { select: { slug: true, updatedAt: true, availability: true, publication: true, title: true } } } }),
    db.savedSearch.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" } }),
    db.enquiry.findMany({ where: { customerId: me.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.siteVisit.findMany({ where: { customerId: me.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.buildProject.findMany({ where: { customerId: me.id }, orderBy: { createdAt: "desc" }, select: { code: true, title: true, status: true, plannedEnd: true } }),
  ]);

  return (
    <div className="wrap py-10">
      <header className="relative flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-[1.25rem] bg-navy p-6 text-ivory sm:p-8">
        <div className="relative">
          <p className="annot text-gold-light">{d.eyebrow}</p>
          <h1 className="mt-3 text-headline">{d.hello(user.name.split(" ")[0])}</h1>
          <p className="text-ivory/75">{user.email}</p>
        </div>
        <form action={logoutCustomer} className="relative"><button className="btn btn-outline">{d.signOut}</button></form>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-2" aria-label={`${mk.mine.title} · ${mk.purchases.title}`}>
        <div id="listings">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="annot text-emerald">{mk.mine.title}</h2>
            <Link href="/account/listings/new" className="link-arrow text-emerald">{mk.mine.add}</Link>
          </div>
          {listings.length ? (
            <ul className="surface mt-4 divide-y divide-line text-sm">
              {listings.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <Link href={`/account/listings/${l.id}`} className="font-semibold text-navy hover:underline">{l.referenceCode} · {l.title}</Link>
                  <span className="text-xs text-slate">{l.publication === "PUBLISHED" ? mk.mine.live : l.submissionStatus ? mk.status[l.submissionStatus] : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate">{mk.mine.empty} <Link href="/sell" className="underline">{t.nav.sell}</Link></p>
          )}
        </div>
        <div id="purchases">
          <h2 className="annot text-emerald">{mk.purchases.title}</h2>
          {purchases.length ? (
            <ul className="surface mt-4 divide-y divide-line text-sm">
              {purchases.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {r.property?.publication === "PUBLISHED" ? <Link href={`/properties/${r.property.slug}`} className="font-semibold text-navy hover:underline">{r.propertyLabel}</Link> : <span className="font-semibold">{r.propertyLabel}</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status === "APPOINTMENT_SCHEDULED" || r.status === "BOOKED" || r.status === "COMPLETED" ? "bg-emerald text-ivory" : "bg-paper text-slate"}`}>{mk.purchaseStatus[r.status]}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate">
                    {r.scheduledFor
                      ? mk.purchases.appointment(mk.buy.modes[r.mode], f.dateTime(r.scheduledFor))
                      : mk.purchases.requested(mk.buy.modes[r.mode], f.date(r.preferredDate, { dateStyle: "medium", timeZone: "UTC" }))}
                    {r.offerAmount !== null && ` · ${mk.purchases.offer(f.price(Number(r.offerAmount)))}`}
                  </p>
                  {r.scheduledFor && r.appointmentNote && <p className="mt-1 whitespace-pre-line text-xs text-ink">{r.appointmentNote}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate">{mk.purchases.empty}</p>
          )}
        </div>
      </section>

      {projects.length > 0 && (
        <section className="mt-10" aria-labelledby="bt-h">
          <h2 id="bt-h" className="annot text-gold-deep">{d.projects}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <li key={p.code}>
                <Link href={`/account/projects/${p.code}`} className="survey-grid block rounded-[1rem] bg-forest p-5 text-ivory transition-transform duration-500 hover:-translate-y-1">
                  <p className="annot-plain text-gold-light">{p.code} · {t.account.build.status[p.status]}</p>
                  <p className="mt-2 font-serif text-2xl">{p.title}</p>
                  <p className="mt-1 text-sm text-ivory/75">{d.plannedCompletion(f.date(p.plannedEnd, { dateStyle: "medium", timeZone: "UTC" }))}</p>
                  <span className="link-arrow mt-3 text-gold-light">{d.track}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12" aria-labelledby="sp-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="sp-h" className="annot text-emerald">{d.saved(saved.length)}</h2>
          {saved.length >= 2 && <Link href={`/compare?p=${saved.slice(0, 4).map((s) => s.property.slug).join(",")}`} className="link-arrow text-emerald">{d.compareSaved}</Link>}
        </div>
        {saved.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map(({ property: p }) => (
              <li key={p.id} className="surface p-2">
                <div className="blob-mask relative aspect-[16/9] bg-paper"><Media src={p.images[0]?.url} alt="" sizes="33vw" /></div>
                <div className="p-3">
                  <AvailabilityBadge value={p.availability} />
                  {p.publication !== "PUBLISHED" && <span className="ml-2 text-xs text-terracotta-deep">{d.notListed}</span>}
                  <Link href={`/twin/${p.slug}`} className="mt-2 block font-serif text-xl text-navy hover:text-emerald">{p.title}</Link>
                  <p className="text-sm text-slate">{p.referenceCode} · {p.publicPrice !== null ? f.price(Number(p.publicPrice)) : t.price.priceOnRequest}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-slate">{d.savedEmpty} <Link href="/plotfit" className="underline">{d.tryPlotfit}</Link>.</p>}
      </section>

      <section className="mt-12" aria-labelledby="sc-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="sc-h" className="annot text-emerald">{d.scenarios(scenarios.length)}</h2>
          {scenarios.length >= 2 && <Link href="/account/compare" className="link-arrow text-emerald">{d.compareScenarios}</Link>}
        </div>
        {scenarios.length ? (
          <div className="surface mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
                <tr>{(["scenario", "house", "estimate", "status"] as const).map((c) => <th key={c} scope="col" className="px-4 py-3">{d.cols[c]}</th>)}<th scope="col" className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scenarios.map((s) => {
                  const r = s.result as ScenarioResult;
                  const st = scenarioStatus(s);
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3"><Link href={`/account/scenarios/${s.id}`} className="font-semibold text-navy hover:underline">{s.name}</Link><span className="block text-xs text-slate">{d.savedOn(f.date(s.updatedAt))}</span></td>
                      <td className="px-4 py-3">{f.area(r.achievedBuiltUpSqft)} {r.feasible ? "" : <span className="text-terracotta-deep">{d.doesntFit}</span>}</td>
                      <td className="px-4 py-3">{f.price(r.estimate.total)}{!r.estimate.complete && <span className="block text-xs text-terracotta-deep">{d.incomplete}</span>}</td>
                      <td className={`px-4 py-3 text-xs ${st.kind === "current" || st.kind === "illustrative" ? "text-slate" : "text-terracotta-deep"}`}>{scenarioNote(st, t.account.scenario, (a) => t.labels.availability[a])}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={studioHref(s)} className="mr-3 underline">{d.reopen}</Link>
                        <form action={deleteScenario.bind(null, s.id)} className="inline"><ConfirmButton message={d.deleteConfirm} className="text-terracotta-deep underline">{d.delete}</ConfirmButton></form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 text-sm text-slate">{d.scenariosEmptyA} <Link href="/studio" className="underline">Property Studio</Link> {d.scenariosEmptyB}</p>}
      </section>

      <section className="mt-12" aria-labelledby="ss-h">
        <h2 id="ss-h" className="annot text-emerald">{d.searches}</h2>
        <div className="mt-3"><AlertConsentForm consent={user.marketingConsent} /></div>
        {searches.length ? (
          <ul className="surface mt-4 divide-y divide-line">
            {searches.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/plotfit/results?${criteriaToQuery(s.criteria as Criteria)}`} className="font-semibold text-navy hover:underline">{s.name}</Link>
                <div className="flex items-center gap-4">
                  <form action={toggleSearchAlerts.bind(null, s.id)}>
                    <button className="underline" disabled={!user.marketingConsent && !s.alertsEnabled}>{d.alertsOnOff(s.alertsEnabled)}</button>
                  </form>
                  <form action={deleteSearch.bind(null, s.id)}><ConfirmButton message={d.deleteSearch} className="text-terracotta-deep underline">{d.delete}</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-slate">{d.searchesEmpty}</p>}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2" aria-label={`${d.enquiries} · ${d.visits}`}>
        <div>
          <h2 className="annot text-emerald">{d.enquiries}</h2>
          {enquiries.length ? (
            <ul className="surface mt-4 divide-y divide-line text-sm">
              {enquiries.map((e) => (
                <li key={e.id} className="px-4 py-3"><span className="font-medium">{t.labels.enquiryType[e.type]}</span>{e.propertyLabel && ` · ${e.propertyLabel}`}<span className="block text-xs text-slate">{f.date(e.createdAt)} · {t.labels.enquiryStatus[e.status === "SPAM" ? "CLOSED" : e.status]}</span></li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate">{d.enquiriesEmpty}</p>}
        </div>
        <div>
          <h2 className="annot text-emerald">{d.visits}</h2>
          {visits.length ? (
            <ul className="surface mt-4 divide-y divide-line text-sm">
              {visits.map((v) => (
                <li key={v.id} className="px-4 py-3"><span className="font-medium">{v.subjectLabel}</span><span className="block text-xs text-slate">{d.requested(f.date(v.preferredDate, { dateStyle: "medium", timeZone: "UTC" }))} · {t.labels.visitStatus[v.status]}{v.scheduledFor ? ` · ${d.confirmedFor(f.dateTime(v.scheduledFor))}` : ""}</span></li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate">{d.visitsEmpty}</p>}
        </div>
      </section>
    </div>
  );
}
