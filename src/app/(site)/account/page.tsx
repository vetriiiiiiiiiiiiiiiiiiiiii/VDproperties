import type { Metadata } from "next";
import Link from "next/link";
import { logoutCustomer } from "@/app/account/_actions/auth";
import { deleteScenario, deleteSearch, toggleSearchAlerts } from "@/app/account/_actions/customer";
import { AlertConsentForm } from "@/components/account/AuthForms";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge } from "@/components/site/ui";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL, SITE_VISIT_STATUS_LABEL } from "@/lib/labels";
import { criteriaToQuery, type Criteria } from "@/lib/plotfit";
import { scenarioStatus, studioHref, type ScenarioResult } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const BUILD_STATUS: Record<string, string> = { PLANNING: "Planning", ACTIVE: "In progress", ON_HOLD: "On hold", HANDOVER: "Handover", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export default async function AccountPage() {
  const me = await requireCustomerPage("/account");
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
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="annot text-emerald">Your account</p>
          <h1 className="mt-3 text-headline text-navy">Hello, {user.name.split(" ")[0]}</h1>
          <p className="text-slate">{user.email}</p>
        </div>
        <form action={logoutCustomer}><button className="btn btn-outline text-navy">Sign out</button></form>
      </header>

      {projects.length > 0 && (
        <section className="mt-10" aria-labelledby="bt-h">
          <h2 id="bt-h" className="annot text-gold-deep">BuildTrace · your construction projects</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <li key={p.code}>
                <Link href={`/account/projects/${p.code}`} className="survey-grid block border border-navy bg-navy p-5 text-ivory hover:bg-navy-deep">
                  <p className="annot-plain text-gold-light">{p.code} · {BUILD_STATUS[p.status]}</p>
                  <p className="mt-2 font-serif text-2xl">{p.title}</p>
                  <p className="mt-1 text-sm text-ivory/75">Planned completion {formatDate(p.plannedEnd, { dateStyle: "medium", timeZone: "UTC" })}</p>
                  <span className="link-arrow mt-3 text-gold-light">Track My Build</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12" aria-labelledby="sp-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="sp-h" className="annot text-emerald">Saved properties ({saved.length})</h2>
          {saved.length >= 2 && <Link href={`/compare?p=${saved.slice(0, 4).map((s) => s.property.slug).join(",")}`} className="link-arrow text-emerald">Compare saved properties</Link>}
        </div>
        {saved.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map(({ property: p }) => (
              <li key={p.id} className="border border-line bg-white">
                <div className="relative aspect-[16/9] bg-paper"><Media src={p.images[0]?.url} alt="" sizes="33vw" /></div>
                <div className="p-4">
                  <AvailabilityBadge value={p.availability} />
                  {p.publication !== "PUBLISHED" && <span className="ml-2 text-xs text-terracotta-deep">No longer listed</span>}
                  <Link href={`/twin/${p.slug}`} className="mt-2 block font-serif text-xl text-navy hover:text-emerald">{p.title}</Link>
                  <p className="text-sm text-slate">{p.referenceCode} · {p.publicPrice !== null ? formatPrice(Number(p.publicPrice)) : "Price on request"}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-slate">Save properties from any Property Twin to keep them here. <Link href="/plotfit" className="underline">Try PlotFit</Link>.</p>}
      </section>

      <section className="mt-12" aria-labelledby="sc-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="sc-h" className="annot text-emerald">Home-design scenarios ({scenarios.length})</h2>
          {scenarios.length >= 2 && <Link href="/account/compare" className="link-arrow text-emerald">Compare scenarios</Link>}
        </div>
        {scenarios.length ? (
          <div className="mt-4 overflow-x-auto border border-line bg-white">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
                <tr><th scope="col" className="px-4 py-3">Scenario</th><th scope="col" className="px-4 py-3">House</th><th scope="col" className="px-4 py-3">Estimate</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scenarios.map((s) => {
                  const r = s.result as ScenarioResult;
                  const st = scenarioStatus(s);
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3"><Link href={`/account/scenarios/${s.id}`} className="font-semibold text-navy hover:underline">{s.name}</Link><span className="block text-xs text-slate">Saved {formatDate(s.updatedAt)}</span></td>
                      <td className="px-4 py-3">{r.achievedBuiltUpSqft.toLocaleString("en-IN")} sq ft {r.feasible ? "" : <span className="text-terracotta-deep">(doesn't fit)</span>}</td>
                      <td className="px-4 py-3">{formatPrice(r.estimate.total)}{!r.estimate.complete && <span className="block text-xs text-terracotta-deep">incomplete</span>}</td>
                      <td className={`px-4 py-3 text-xs ${st.kind === "current" || st.kind === "illustrative" ? "text-slate" : "text-terracotta-deep"}`}>{st.note}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={studioHref(s)} className="mr-3 underline">Reopen</Link>
                        <form action={deleteScenario.bind(null, s.id)} className="inline"><ConfirmButton message="Delete this scenario?" className="text-terracotta-deep underline">Delete</ConfirmButton></form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 text-sm text-slate">Design a home in <Link href="/studio" className="underline">Property Studio</Link> and save it to compare later.</p>}
      </section>

      <section className="mt-12" aria-labelledby="ss-h">
        <h2 id="ss-h" className="annot text-emerald">Saved searches</h2>
        <div className="mt-3"><AlertConsentForm consent={user.marketingConsent} /></div>
        {searches.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line bg-white">
            {searches.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/plotfit/results?${criteriaToQuery(s.criteria as Criteria)}`} className="font-semibold text-navy hover:underline">{s.name}</Link>
                <div className="flex items-center gap-4">
                  <form action={toggleSearchAlerts.bind(null, s.id)}>
                    <button className="underline" disabled={!user.marketingConsent && !s.alertsEnabled}>{s.alertsEnabled ? "Alerts on — turn off" : "Turn alerts on"}</button>
                  </form>
                  <form action={deleteSearch.bind(null, s.id)}><ConfirmButton message="Delete this saved search?" className="text-terracotta-deep underline">Delete</ConfirmButton></form>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-slate">Save a search from your PlotFit results.</p>}
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2" aria-label="Enquiries and site visits">
        <div>
          <h2 className="annot text-emerald">Your enquiries</h2>
          {enquiries.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line bg-white text-sm">
              {enquiries.map((e) => (
                <li key={e.id} className="px-4 py-3"><span className="font-medium">{ENQUIRY_TYPE_LABEL[e.type]}</span>{e.propertyLabel && ` · ${e.propertyLabel}`}<span className="block text-xs text-slate">{formatDate(e.createdAt)} · {ENQUIRY_STATUS_LABEL[e.status === "SPAM" ? "CLOSED" : e.status]}</span></li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate">Enquiries you send while signed in appear here.</p>}
        </div>
        <div>
          <h2 className="annot text-emerald">Your site visit requests</h2>
          {visits.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line bg-white text-sm">
              {visits.map((v) => (
                <li key={v.id} className="px-4 py-3"><span className="font-medium">{v.subjectLabel}</span><span className="block text-xs text-slate">Requested {formatDate(v.preferredDate, { dateStyle: "medium", timeZone: "UTC" })} · {SITE_VISIT_STATUS_LABEL[v.status]}{v.scheduledFor ? ` · confirmed for ${formatDate(v.scheduledFor, { dateStyle: "medium", timeStyle: "short" })}` : ""}</span></li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate">Site visits you request while signed in appear here.</p>}
        </div>
      </section>
    </div>
  );
}
