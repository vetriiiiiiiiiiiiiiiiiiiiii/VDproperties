import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProperty, setAvailability, toggleFeatured } from "@/app/admin/_actions/properties";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DocumentManager } from "@/components/admin/DocumentManager";
import { PassportAddForm, PassportItemForm, TwinDataForm } from "@/components/admin/PlatformForms";
import { PASSPORT_STATUS_LABEL } from "@/lib/platform";
import { formatDate } from "@/lib/format";
import { ImageManager } from "@/components/admin/ImageManager";
import { Panel } from "@/components/admin/kit";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { PropertyForm, type PropertyFormValues } from "@/components/admin/PropertyForm";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { propertyFormOptions } from "../form-data";

export const metadata = { title: "Edit property" };

export default async function EditProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requirePage("properties:manage");
  const { id } = await params;
  const { created } = await searchParams;
  const p = await db.property.findUnique({
    where: { id },
    include: { amenities: { select: { id: true } }, images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, documents: { orderBy: { createdAt: "asc" } }, passport: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { reviewer: { select: { name: true } } } }, activity: { orderBy: { createdAt: "desc" }, take: 15 }, _count: { select: { enquiries: true, siteVisits: true } } },
  });
  if (!p) notFound();
  const [options, developers] = await Promise.all([propertyFormOptions(), db.developer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, authorised: true } })]);
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const values: PropertyFormValues = {
    title: p.title, slug: p.slug, referenceCode: p.referenceCode, type: p.type, availability: p.availability, publication: p.publication,
    featured: p.featured, isSample: p.isSample, summary: s(p.summary), description: s(p.description), locationId: s(p.locationId),
    localityLabel: s(p.localityLabel), latitude: s(p.latitude), longitude: s(p.longitude), showExactLocation: p.showExactLocation, mapUrl: s(p.mapUrl),
    priceAmount: s(p.priceAmount), priceDisplay: p.priceDisplay, priceNote: s(p.priceNote), landAreaSqft: s(p.landAreaSqft), landAreaLabel: s(p.landAreaLabel),
    plotDimensions: s(p.plotDimensions), facing: s(p.facing), builtUpAreaSqft: s(p.builtUpAreaSqft), bedrooms: s(p.bedrooms), bathrooms: s(p.bathrooms),
    floors: s(p.floors), accessRoad: s(p.accessRoad), utilities: s(p.utilities), developmentStatus: s(p.developmentStatus), constructionSpecs: s(p.constructionSpecs),
    approvalInfo: s(p.approvalInfo), projectId: s(p.projectId), seoTitle: s(p.seoTitle), seoDescription: s(p.seoDescription), amenityIds: p.amenities.map((a) => a.id),
  };

  return (
    <>
      <PageHeader
        title={p.title}
        description={`${p.referenceCode} · last updated ${formatDateTime(p.updatedAt)}`}
        back={{ href: "/admin/properties", label: "Properties" }}
        actions={
          <>
            <Link href={`/admin/properties/${p.id}/preview`} className="btn btn-outline min-h-10 text-sm text-navy" target="_blank">Preview</Link>
            {p.publication === "PUBLISHED" && <Link href={`/properties/${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy" target="_blank">View live</Link>}
            {p.publication === "PUBLISHED" && <Link href={`/twin/${p.slug}`} className="btn btn-outline min-h-10 text-sm text-navy" target="_blank">Property Twin</Link>}
          </>
        }
      />
      {created && <Notice tone="ok">Draft created. Add photographs below, then publish when ready.</Notice>}

      <div className="grid gap-6 2xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <PropertyForm id={p.id} values={values} {...options} />
        </div>
        <div className="space-y-6">
          <Panel title="Quick actions">
            <p className="field-label">Mark as</p>
            <div className="flex flex-wrap gap-2">
              {(["AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE"] as const).map((a) => (
                <form key={a} action={setAvailability.bind(null, p.id, a)}>
                  <button type="submit" disabled={p.availability === a} className={`border px-3 py-1.5 text-sm ${p.availability === a ? "border-forest bg-forest text-ivory" : "border-line hover:border-emerald"}`}>
                    {a.charAt(0) + a.slice(1).toLowerCase()}
                  </button>
                </form>
              ))}
            </div>
            <form action={toggleFeatured.bind(null, p.id)} className="mt-4">
              <button type="submit" className="border border-line px-3 py-1.5 text-sm hover:border-emerald">{p.featured ? "★ Remove from featured" : "☆ Feature on homepage"}</button>
            </form>
            <p className="mt-4 text-sm text-slate">{p._count.enquiries} enquiries · {p._count.siteVisits} site visit requests are linked to this property.</p>
            {p.publication === "DRAFT" && (
              <form action={deleteProperty.bind(null, p.id)} className="mt-4 border-t border-line pt-4">
                <ConfirmButton message="Delete this draft property permanently? Linked enquiries will be kept." className="text-sm text-terracotta-deep underline">Delete draft</ConfirmButton>
              </form>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Panel title="Photographs & plans" description="The first photo is the cover image. Only publish images you have permission to use.">
          <ImageManager target="property" ownerId={p.id} images={p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, kind: i.kind }))} />
        </Panel>
        <Panel title="Documents" description="PDFs are staff-only unless you make them public.">
          <DocumentManager propertyId={p.id} documents={p.documents.map((d) => ({ id: d.id, title: d.title, isPublic: d.isPublic }))} />
        </Panel>
        <Panel title="Property Twin data" description="Geometry, orientation, setbacks, boundary and surroundings — used by the Twin, Studio and PlotFit.">
          <TwinDataForm
            propertyId={p.id}
            developers={developers}
            v={{
              plotWidthFt: s(p.plotWidthFt), plotDepthFt: s(p.plotDepthFt), frontBearing: s(p.frontBearing), setbackFrontFt: s(p.setbackFrontFt), setbackRearFt: s(p.setbackRearFt),
              setbackSideFt: s(p.setbackSideFt), maxCoveragePct: s(p.maxCoveragePct), siteConstraints: s(p.siteConstraints), boundaryStatus: p.boundaryStatus, boundarySource: s(p.boundarySource),
              boundary: Array.isArray(p.boundary) ? (p.boundary as [number, number][]).map((pt) => pt.join(", ")).join("\n") : "",
              facilities: Array.isArray(p.nearbyFacilities) ? (p.nearbyFacilities as Record<string, unknown>[]).map((f) => [f.name, f.kind, f.distanceKm ?? "", f.status, f.source ?? ""].join(" | ")).join("\n") : "",
              developerId: s(p.developerId),
            }}
          />
        </Panel>
        <Panel title="Property Passport" description="Document and verification register shown on the Twin. Not a guarantee of title or approval.">
          {p.passport.map((x) => (
            <PassportItemForm
              key={x.id}
              documents={p.documents.map((d) => ({ id: d.id, title: d.title }))}
              item={{ id: x.id, documentType: x.documentType, status: x.status, documentId: s(x.documentId), publicNote: s(x.publicNote), privateNote: s(x.privateNote), customerVisible: x.customerVisible, reviewed: x.reviewedAt ? `${PASSPORT_STATUS_LABEL.REVIEWED} ${formatDate(x.reviewedAt)}${x.reviewer ? ` by ${x.reviewer.name}` : ""}` : "" }}
            />
          ))}
          <div className="mt-4"><PassportAddForm propertyId={p.id} /></div>
        </Panel>
        <Panel title="Property history" description="Recorded automatically. Staff-only entries are marked.">
          <ul className="space-y-1 text-sm">
            {p.activity.map((a) => <li key={a.id}>{formatDate(a.createdAt)} · {a.summary}{!a.isPublic && <span className="text-xs text-terracotta-deep"> (staff only)</span>}</li>)}
            {p.activity.length === 0 && <li className="text-slate">No history yet.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
