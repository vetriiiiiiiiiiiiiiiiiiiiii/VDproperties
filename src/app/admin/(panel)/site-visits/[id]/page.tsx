import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/admin/kit";
import { NoteForm, VisitUpdateForm } from "@/components/admin/LeadForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, phoneHref } from "@/lib/format";
import { SITE_VISIT_STATUS_LABEL, TIME_SLOT_LABEL } from "@/lib/labels";
import { requireInScopePage, assignableStaff } from "@/lib/zones";

export const metadata = { title: "Site visit" };

export default async function VisitDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("leads:manage");
  const { id } = await params;
  await requireInScopePage(user, "siteVisit", id);
  const v = await db.siteVisit.findUnique({
    where: { id },
    include: { property: { select: { id: true, location: { select: { zoneId: true } } } }, project: { select: { id: true } }, notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } } },
  });
  if (!v) notFound();
  const staff = await assignableStaff(v.property?.location?.zoneId);
  return (
    <>
      <PageHeader title={v.name} description={`Site visit · ${SITE_VISIT_STATUS_LABEL[v.status]} · ref ${v.id.slice(-8).toUpperCase()}`} back={{ href: "/admin/site-visits", label: "Site visits" }} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Request">
            <dl className="divide-y divide-line text-sm">
              {([
                ["Property / project", <span key="s">{v.subjectLabel}{v.property ? <> · <Link href={`/admin/properties/${v.property.id}`} className="underline">open listing</Link></> : v.project ? <> · <Link href={`/admin/projects/${v.project.id}`} className="underline">open project</Link></> : ""}</span>],
                ["Preferred date", formatDate(v.preferredDate, { dateStyle: "full", timeZone: "UTC" })],
                ["Preferred time", TIME_SLOT_LABEL[v.timeSlot]],
                ["Confirmed for", v.scheduledFor ? formatDateTime(v.scheduledFor) : "Not yet confirmed"],
                ["Phone", <a key="p" href={`tel:${phoneHref(v.phone)}`} className="underline">{v.phone}</a>],
                ["Email", v.email],
                ["Received", formatDateTime(v.createdAt)],
              ] as [string, React.ReactNode][]).filter(([, x]) => x).map(([k, x]) => (
                <div key={k} className="grid grid-cols-[11rem_1fr] gap-4 py-2.5"><dt className="text-slate">{k}</dt><dd>{x}</dd></div>
              ))}
            </dl>
            {v.message && <div className="mt-5 whitespace-pre-line border-l-4 border-gold bg-ivory p-4 text-sm">{v.message}</div>}
          </Panel>
          <Panel title="Internal notes">
            <NoteForm target={{ siteVisitId: v.id }} />
            <ul className="mt-6 space-y-4">
              {v.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-line pl-4 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-slate">{n.author?.name ?? "Former staff member"} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Manage">
          <VisitUpdateForm id={v.id} status={v.status} assignedToId={v.assignedToId} followUpAt={v.followUpAt?.toISOString() ?? null} scheduledFor={v.scheduledFor?.toISOString() ?? null} staff={staff} />
        </Panel>
      </div>
    </>
  );
}
