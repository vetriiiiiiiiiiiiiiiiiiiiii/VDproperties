import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { AVAILABILITY_LABEL, ENQUIRY_TYPE_LABEL, TIME_SLOT_LABEL } from "@/lib/labels";
import { can } from "@/lib/rbac";
import { getSettings, launchChecklist } from "@/lib/settings";

export const metadata = { title: "Overview" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requirePage();
  const { denied } = await searchParams;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const pub = { publication: "PUBLISHED" as const };
  const open = { availability: { in: ["AVAILABLE" as const, "RESERVED" as const] } };

  const [published, plots, houses, ongoing, newEnquiries, upcomingVisits, recent, samples, settings] = await Promise.all([
    db.property.count({ where: pub }),
    db.property.count({ where: { ...pub, ...open, type: { in: ["RESIDENTIAL_PLOT", "LAND"] } } }),
    db.property.count({ where: { ...pub, ...open, type: { in: ["HOUSE", "VILLA"] } } }),
    db.project.count({ where: { ...pub, status: "ONGOING" } }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.siteVisit.count({ where: { status: { in: ["NEW", "CONTACTED", "SCHEDULED"] }, preferredDate: { gte: today } } }),
    db.property.findMany({ orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true, referenceCode: true, publication: true, availability: true, updatedAt: true } }),
    db.property.count({ where: { isSample: true } }),
    getSettings(),
  ]);

  const leads = can(user.role, "leads:manage");
  const [latestEnquiries, nextVisits] = leads
    ? await Promise.all([
        db.enquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, type: true, propertyLabel: true, createdAt: true } }),
        db.siteVisit.findMany({
          where: { status: { in: ["NEW", "CONTACTED", "SCHEDULED"] }, preferredDate: { gte: today } },
          orderBy: { preferredDate: "asc" },
          take: 5,
          select: { id: true, name: true, subjectLabel: true, preferredDate: true, timeSlot: true, status: true, scheduledFor: true },
        }),
      ])
    : [[], []];

  const checklist = launchChecklist(settings);
  const missing = checklist.filter((c) => !c.done);

  const stats: [string, number, string | null][] = [
    ["Published properties", published, can(user.role, "properties:manage") ? "/admin/properties?publication=PUBLISHED" : null],
    ["Available plots & land", plots, can(user.role, "properties:manage") ? "/admin/properties?group=land" : null],
    ["Available houses & villas", houses, can(user.role, "properties:manage") ? "/admin/properties?group=homes" : null],
    ["Ongoing projects", ongoing, can(user.role, "projects:manage") ? "/admin/projects" : null],
    ["New enquiries", newEnquiries, leads ? "/admin/enquiries?status=NEW" : null],
    ["Upcoming site visits", upcomingVisits, leads ? "/admin/site-visits?upcoming=1" : null],
  ];

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(" ")[0]}`} description="Live figures from the database." />
      {denied && <Notice tone="warn">Your role doesn't have access to that section.</Notice>}
      {samples > 0 && can(user.role, "properties:manage") && (
        <Notice tone="warn">
          {samples} sample listing{samples > 1 ? "s are" : " is"} live on the website with “Sample” labels. Delete or replace them before launch.{" "}
          <Link href="/admin/properties?sample=1" className="underline">Review sample listings</Link>
        </Notice>
      )}

      <dl className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value, href]) => {
          const inner = (
            <>
              <dt className="annot-plain text-slate">{label}</dt>
              <dd className="mt-3 font-serif text-5xl text-navy">{value}</dd>
            </>
          );
          return href ? (
            <Link key={label} href={href} className="block bg-white p-6 hover:bg-paper">{inner}</Link>
          ) : (
            <div key={label} className="bg-white p-6">{inner}</div>
          );
        })}
      </dl>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {leads && (
          <section className="border border-line bg-white">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold" style={{ fontFamily: "var(--font-sans)" }}>New enquiries</h2>
            {latestEnquiries.length ? (
              <ul className="divide-y divide-line">
                {latestEnquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/enquiries/${e.id}`} className="flex justify-between gap-4 px-5 py-3 hover:bg-paper">
                      <span>
                        <span className="font-medium">{e.name}</span>
                        <span className="block text-sm text-slate">{ENQUIRY_TYPE_LABEL[e.type]}{e.propertyLabel ? ` · ${e.propertyLabel}` : ""}</span>
                      </span>
                      <span className="shrink-0 text-sm text-slate">{formatDateTime(e.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate">No new enquiries.</p>
            )}
          </section>
        )}
        {leads && (
          <section className="border border-line bg-white">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold" style={{ fontFamily: "var(--font-sans)" }}>Upcoming site visits</h2>
            {nextVisits.length ? (
              <ul className="divide-y divide-line">
                {nextVisits.map((v) => (
                  <li key={v.id}>
                    <Link href={`/admin/site-visits/${v.id}`} className="flex justify-between gap-4 px-5 py-3 hover:bg-paper">
                      <span>
                        <span className="font-medium">{v.name}</span>
                        <span className="block text-sm text-slate">{v.subjectLabel}</span>
                      </span>
                      <span className="shrink-0 text-right text-sm text-slate">
                        {v.scheduledFor ? <>Confirmed {formatDateTime(v.scheduledFor)}</> : <>Requested {formatDate(v.preferredDate)}<br />{TIME_SLOT_LABEL[v.timeSlot].split(" (")[0]}</>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-slate">No upcoming visits.</p>
            )}
          </section>
        )}
        <section className="border border-line bg-white">
          <h2 className="border-b border-line px-5 py-4 text-base font-semibold" style={{ fontFamily: "var(--font-sans)" }}>Recent property updates</h2>
          <ul className="divide-y divide-line">
            {recent.map((p) => (
              <li key={p.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                {can(user.role, "properties:manage") ? (
                  <Link href={`/admin/properties/${p.id}`} className="font-medium hover:text-emerald">{p.referenceCode} · {p.title}</Link>
                ) : (
                  <span className="font-medium">{p.referenceCode} · {p.title}</span>
                )}
                <span className="shrink-0 text-slate">{p.publication === "DRAFT" ? "Draft" : AVAILABILITY_LABEL[p.availability]} · {formatDate(p.updatedAt)}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="px-5 py-6 text-slate">No properties yet.</li>}
          </ul>
        </section>
        {can(user.role, "settings:manage") && (
          <section className="border border-line bg-white">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold" style={{ fontFamily: "var(--font-sans)" }}>
              Launch checklist · {checklist.length - missing.length}/{checklist.length}
            </h2>
            <ul className="divide-y divide-line">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <span aria-hidden="true" className={c.done ? "text-emerald" : "text-terracotta"}>{c.done ? "✓" : "○"}</span>
                  <span className={c.done ? "text-slate line-through" : ""}>{c.label}</span>
                  <span className="sr-only">{c.done ? "done" : "to do"}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-3 text-sm"><Link href="/admin/settings" className="underline">Open company settings</Link></p>
          </section>
        )}
      </div>
    </>
  );
}
