import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/admin/kit";
import { EnquiryUpdateForm, NoteForm } from "@/components/admin/LeadForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatArea, formatDateTime, phoneHref } from "@/lib/format";
import { ENQUIRY_STATUS_LABEL, ENQUIRY_TYPE_LABEL } from "@/lib/labels";

export const metadata = { title: "Enquiry" };

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("leads:manage");
  const e = await db.enquiry.findUnique({
    where: { id: (await params).id },
    include: {
      property: { select: { id: true, slug: true, publication: true } },
      project: { select: { id: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!e) notFound();
  const staff = await db.user.findMany({ where: { active: true, role: { in: ["SUPER_ADMIN", "ENQUIRY_MANAGER"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const rows: [string, React.ReactNode][] = [
    ["Received", formatDateTime(e.createdAt)],
    ["Type", ENQUIRY_TYPE_LABEL[e.type]],
    ["Phone", <a key="p" href={`tel:${phoneHref(e.phone)}`} className="underline">{e.phone}</a>],
    ["Email", e.email ? <a key="e" href={`mailto:${e.email}`} className="underline">{e.email}</a> : null],
    ["Property / project", e.propertyLabel ? (
      <span key="pl">{e.propertyLabel}{e.property ? <> · <Link href={`/admin/properties/${e.property.id}`} className="underline">open listing</Link></> : e.project ? <> · <Link href={`/admin/projects/${e.project.id}`} className="underline">open project</Link></> : " (listing removed)"}</span>
    ) : null],
    ["Plot location", e.siteLocation],
    ["Owns land", e.hasLand === null ? null : e.hasLand ? "Yes" : "No"],
    ["Plot area", e.plotAreaSqft ? formatArea(e.plotAreaSqft) : null],
    ["Preferred house size", e.houseSizeSqft ? formatArea(e.houseSizeSqft) : null],
    ["Budget", e.budgetRange],
    ["Start", e.startTimeframe],
    ["Sent from", e.sourcePath],
    ["Consent to contact", e.consent ? "Given" : "Not recorded"],
  ];
  return (
    <>
      <PageHeader title={e.name} description={`${ENQUIRY_TYPE_LABEL[e.type]} · ${ENQUIRY_STATUS_LABEL[e.status]} · ref ${e.id.slice(-8).toUpperCase()}`} back={{ href: "/admin/enquiries", label: "Enquiries" }} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Details">
            <dl className="divide-y divide-line">
              {rows.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={k} className="grid grid-cols-[11rem_1fr] gap-4 py-2.5 text-sm"><dt className="text-slate">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {e.message && <div className="mt-5 whitespace-pre-line border-l-4 border-gold bg-ivory p-4 text-sm">{e.message}</div>}
          </Panel>
          <Panel title="Internal notes">
            <NoteForm target={{ enquiryId: e.id }} />
            <ul className="mt-6 space-y-4">
              {e.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-line pl-4 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-slate">{n.author?.name ?? "Former staff member"} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Manage">
          <EnquiryUpdateForm id={e.id} status={e.status} assignedToId={e.assignedToId} followUpAt={e.followUpAt?.toISOString() ?? null} staff={staff} />
        </Panel>
      </div>
    </>
  );
}
