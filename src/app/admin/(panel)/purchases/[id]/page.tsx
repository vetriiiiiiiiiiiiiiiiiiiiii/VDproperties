import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/admin/kit";
import { NoteForm } from "@/components/admin/LeadForms";
import { PurchaseUpdateForm } from "@/components/admin/MarketForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatPrice, phoneHref } from "@/lib/format";
import { APPOINTMENT_MODE_LABEL, FUNDING_LABEL, PURCHASE_STATUS_LABEL, TIME_SLOT_LABEL } from "@/lib/labels";
import { can } from "@/lib/rbac";
import { requireInScopePage, assignableStaff } from "@/lib/zones";

export const metadata = { title: "Purchase request" };

export default async function PurchaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("purchases:manage");
  const { id } = await params;
  await requireInScopePage(user, "purchase", id);
  const r = await db.purchaseRequest.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, slug: true, availability: true, publication: true, publicPrice: true, source: true, location: { select: { zoneId: true } } } },
      buyer: { select: { createdAt: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!r) notFound();
  const staff = await assignableStaff(r.property?.location?.zoneId);
  const rows: [string, React.ReactNode][] = [
    ["Received", formatDateTime(r.createdAt)],
    ["Phone", <a key="p" href={`tel:${phoneHref(r.phone)}`} className="underline">{r.phone}</a>],
    ["Email", r.email ? <a key="e" href={`mailto:${r.email}`} className="underline">{r.email}</a> : null],
    ["Property", <span key="pr">{r.propertyLabel}{r.property ? <> · <Link href={`/properties/${r.property.slug}`} target="_blank" className="underline">view listing</Link> · {r.property.availability.toLowerCase()}{r.property.source === "OWNER" ? " · owner listing" : ""}</> : " (listing removed)"}</span>],
    ["Listed price", r.property?.publicPrice != null ? formatPrice(Number(r.property.publicPrice)) : "On request"],
    ["Buyer's offer", r.offerAmount !== null ? formatPrice(Number(r.offerAmount)) : "None given"],
    ["Funding", FUNDING_LABEL[r.funding]],
    ["Timeline", r.timeline],
    ["Appointment asked for", `${APPOINTMENT_MODE_LABEL[r.mode]} · ${formatDate(r.preferredDate, { dateStyle: "full", timeZone: "UTC" })} · ${TIME_SLOT_LABEL[r.timeSlot]}`],
    ["Confirmed appointment", r.scheduledFor ? formatDateTime(r.scheduledFor) : "Not yet confirmed"],
    ["Customer since", r.buyer ? formatDate(r.buyer.createdAt) : "Account removed"],
  ];
  return (
    <>
      <PageHeader title={r.name} description={`Purchase request · ${PURCHASE_STATUS_LABEL[r.status]} · ref ${r.id.slice(-8).toUpperCase()}`} back={{ href: "/admin/purchases", label: "Purchase requests" }} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Request">
            <dl className="divide-y divide-line">
              {rows.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={k} className="grid grid-cols-[11rem_1fr] gap-4 py-2.5 text-sm"><dt className="text-slate">{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {r.message && <div className="mt-5 whitespace-pre-line border-l-4 border-gold bg-ivory p-4 text-sm">{r.message}</div>}
          </Panel>
          <Panel title="Internal notes">
            <NoteForm target={{ purchaseId: r.id }} />
            <ul className="mt-6 space-y-4">
              {r.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-line pl-4 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-slate">{n.author?.name ?? "Former staff member"} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Manage">
          <PurchaseUpdateForm
            id={r.id}
            status={r.status}
            assignedToId={r.assignedToId}
            scheduledFor={r.scheduledFor?.toISOString() ?? null}
            appointmentNote={r.appointmentNote ?? ""}
            followUpAt={r.followUpAt?.toISOString() ?? null}
            staff={staff}
            canChangeProperty={!!r.property && can(user.role, "properties:publish")}
          />
        </Panel>
      </div>
    </>
  );
}
