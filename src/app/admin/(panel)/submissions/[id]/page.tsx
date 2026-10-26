import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/admin/kit";
import { SubmissionDecisionForm, SubmissionReviewForm } from "@/components/admin/MarketForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatArea, formatDateTime, formatPrice, phoneHref } from "@/lib/format";
import { PROPERTY_TYPE_LABEL, SELLER_RELATION_LABEL, SUBMISSION_STATUS_LABEL } from "@/lib/labels";
import { can } from "@/lib/rbac";
import { requireInScopePage } from "@/lib/zones";

export const metadata = { title: "Owner submission" };

const OPEN = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "INSPECTED"];

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePage("submissions:review");
  const { id } = await params;
  await requireInScopePage(user, "property", id);
  const p = await db.property.findFirst({
    where: { id, source: "OWNER" },
    include: {
      seller: { select: { name: true, email: true, phone: true, createdAt: true } },
      location: { select: { id: true, name: true, zone: { select: { name: true } } } },
      inspectedBy: { select: { name: true } },
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      documents: { orderBy: { createdAt: "asc" } },
      submissionEvents: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true, role: true } } } },
    },
  });
  if (!p || !p.submissionStatus) notFound();
  const open = OPEN.includes(p.submissionStatus);
  const canDecide = can(user.role, "submissions:approve");
  const locations = canDecide ? await db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true, zone: { select: { name: true } } } }) : [];
  const rows: [string, React.ReactNode][] = [
    ["Type", PROPERTY_TYPE_LABEL[p.type]],
    ["Seller", p.seller ? <span key="s">{p.seller.name} · <a href={`tel:${phoneHref(p.seller.phone ?? "")}`} className="underline">{p.seller.phone}</a> · <a href={`mailto:${p.seller.email}`} className="underline">{p.seller.email}</a></span> : "Account removed"],
    ["Relationship", p.sellerRelation ? SELLER_RELATION_LABEL[p.sellerRelation] ?? p.sellerRelation : null],
    ["Catalogue location", p.location ? `${p.location.name}${p.location.zone ? ` · ${p.location.zone.name}` : " · no zone"}` : null],
    ["Area typed by seller", p.sellerLocationText],
    ["Locality to show", p.localityLabel],
    ["Full address (private)", p.sellerAddress],
    ["Land area", p.landAreaSqft ? formatArea(p.landAreaSqft) : null],
    ["Dimensions", p.plotDimensions],
    ["Facing", p.facing],
    ["Built-up area", p.builtUpAreaSqft ? formatArea(p.builtUpAreaSqft) : null],
    ["Bedrooms / bathrooms / floors", p.bedrooms || p.bathrooms || p.floors ? `${p.bedrooms ?? "—"} / ${p.bathrooms ?? "—"} / ${p.floors ?? "—"}` : null],
    ["Access road", p.accessRoad],
    ["Approvals & documents", p.approvalInfo],
    ["Expected price (private)", p.priceAmount !== null ? formatPrice(Number(p.priceAmount)) : null],
    ["Inspected", p.inspectedAt ? `${formatDateTime(p.inspectedAt)} by ${p.inspectedBy?.name ?? "former staff"}` : null],
  ];
  return (
    <>
      <PageHeader
        title={p.title}
        description={`${p.referenceCode} · ${SUBMISSION_STATUS_LABEL[p.submissionStatus]} · submitted ${p.submittedAt ? formatDateTime(p.submittedAt) : "—"}`}
        back={{ href: "/admin/submissions", label: "Owner submissions" }}
        actions={p.submissionStatus === "APPROVED" && can(user.role, "properties:manage") ? <Link href={`/admin/properties/${p.id}`} className="btn btn-primary min-h-10 text-sm">Open listing</Link> : undefined}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Panel title="Details from the seller">
            <dl className="divide-y divide-line">
              {rows.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={k} className="grid grid-cols-[12rem_1fr] gap-4 py-2.5 text-sm"><dt className="text-slate">{k}</dt><dd className="whitespace-pre-line">{v}</dd></div>
              ))}
            </dl>
            {p.description && <div className="mt-5 whitespace-pre-line border-l-4 border-gold bg-ivory p-4 text-sm">{p.description}</div>}
            {p.inspectionNotes && <div className="mt-5 whitespace-pre-line border-l-4 border-emerald bg-ivory p-4 text-sm"><strong>Inspection notes:</strong> {p.inspectionNotes}</div>}
          </Panel>
          <Panel title={`Photos (${p.images.length})`}>
            {p.images.length ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {p.images.map((i) => (
                  <li key={i.id}><a href={i.url} target="_blank" rel="noopener" className="block aspect-[4/3] overflow-hidden bg-paper">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={i.url} alt={i.alt} className="h-full w-full object-cover" /></a></li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate">No photos yet.</p>}
          </Panel>
          <Panel title={`Documents (${p.documents.length})`}>
            {p.documents.length ? (
              <ul className="space-y-1 text-sm">{p.documents.map((d) => <li key={d.id}><a href={`/documents/${d.id}`} target="_blank" rel="noopener" className="underline">{d.title} (PDF)</a></li>)}</ul>
            ) : <p className="text-sm text-slate">No documents uploaded.</p>}
          </Panel>
          <Panel title="History">
            <ol className="space-y-3 text-sm">
              {p.submissionEvents.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  {e.status && <p className="font-semibold">{SUBMISSION_STATUS_LABEL[e.status]}</p>}
                  {e.message && <p className="whitespace-pre-line">{e.message}</p>}
                  <p className="text-xs text-slate">{e.actor ? (e.actor.role === "CUSTOMER" ? "Seller" : e.actor.name) : "System"} · {formatDateTime(e.createdAt)}{!e.visibleToSeller && " · internal"}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="space-y-6">
          {open ? (
            <>
              <Panel title="Review"><SubmissionReviewForm id={p.id} status={p.submissionStatus} /></Panel>
              {canDecide && (
                <Panel title="Decision" description="Approving adds it to Properties as a draft. Check the photos and price display, then publish.">
                  <SubmissionDecisionForm
                    id={p.id}
                    locationId={p.location?.id ?? ""}
                    locations={locations.map((l) => ({ id: l.id, label: `${l.name}${l.city ? `, ${l.city}` : ""}${l.zone ? ` · ${l.zone.name}` : ""}` }))}
                  />
                </Panel>
              )}
            </>
          ) : (
            <Panel title="Closed"><p className="text-sm text-slate">This submission is {SUBMISSION_STATUS_LABEL[p.submissionStatus].toLowerCase()}.</p></Panel>
          )}
        </div>
      </div>
    </>
  );
}
