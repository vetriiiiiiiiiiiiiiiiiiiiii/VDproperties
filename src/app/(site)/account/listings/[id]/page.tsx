import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/i18n/Link";
import { SellerFiles, SellerListingForm, WithdrawListing } from "@/components/account/SellerForms";
import { Breadcrumbs } from "@/components/site/ui";
import { getI18n } from "@/i18n/server";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_SELLER_DOCUMENTS, MAX_SELLER_PHOTOS, SELLER_EDITABLE, SELLER_OPEN } from "@/lib/listings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.mine.meta, robots: { index: false } };
}

const STATUS_TONE: Record<string, string> = {
  SUBMITTED: "bg-navy/10 text-navy",
  UNDER_REVIEW: "bg-gold/20 text-gold-deep",
  CHANGES_REQUESTED: "bg-terracotta/15 text-terracotta-deep",
  INSPECTED: "bg-gold/20 text-gold-deep",
  APPROVED: "bg-emerald text-ivory",
  REJECTED: "bg-paper text-slate",
  WITHDRAWN: "bg-paper text-slate",
};

export default async function MyListing({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const { id } = await params;
  const me = await requireCustomerPage(`/account/listings/${id}`);
  const { t, f } = await getI18n();
  const d = t.market.detail;
  const p = await db.property.findFirst({
    where: { id, sellerId: me.id, source: "OWNER" },
    include: {
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, url: true } },
      documents: { orderBy: { createdAt: "asc" }, select: { id: true, title: true } },
      submissionEvents: { where: { visibleToSeller: true }, orderBy: { createdAt: "desc" }, include: { actor: { select: { role: true } } } },
      seller: { select: { name: true, phone: true } },
    },
  });
  if (!p || !p.submissionStatus) notFound();
  const { created } = await searchParams;
  const editable = SELLER_EDITABLE.includes(p.submissionStatus);
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const [locations] = await Promise.all([db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } })]);

  return (
    <div className="wrap max-w-5xl py-10">
      <Breadcrumbs items={[{ label: t.account.dash.eyebrow, href: "/account" }, { label: t.market.mine.title, href: "/account/listings" }, { label: p.referenceCode }]} />
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="annot text-emerald">{p.referenceCode}</p>
          <h1 className="mt-3 text-headline text-navy">{p.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate">{d.status}:</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_TONE[p.submissionStatus]}`}>
              {p.publication === "PUBLISHED" ? t.market.mine.live : t.market.status[p.submissionStatus]}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {p.publication === "PUBLISHED" && <Link href={`/properties/${p.slug}`} className="btn btn-outline text-navy">{t.market.mine.view}</Link>}
          {SELLER_OPEN.includes(p.submissionStatus) && <WithdrawListing id={p.id} />}
        </div>
      </header>

      {created && <p role="status" className="mt-6 border-l-4 border-emerald bg-white p-4 text-sm">{t.market.msg.created}</p>}
      {p.publication === "PUBLISHED" ? (
        <p className="mt-6 border-l-4 border-emerald bg-white p-4 text-sm">{d.liveNote}</p>
      ) : p.submissionStatus === "APPROVED" ? (
        <p className="mt-6 border-l-4 border-emerald bg-white p-4 text-sm">{d.approvedNote}</p>
      ) : !editable && SELLER_OPEN.includes(p.submissionStatus) ? (
        <p className="mt-6 border-l-4 border-gold bg-white p-4 text-sm">{d.locked}</p>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <SellerFiles id={p.id} images={p.images} documents={p.documents} editable={editable} maxPhotos={MAX_SELLER_PHOTOS} maxDocs={MAX_SELLER_DOCUMENTS} />
          {editable && (
            <section>
              <h2 className="annot text-emerald">{d.edit}</h2>
              <div className="mt-4">
                <SellerListingForm
                  id={p.id}
                  resubmit={p.submissionStatus === "CHANGES_REQUESTED"}
                  locations={locations.map((l) => ({ id: l.id, label: l.name.replace(/\s*\(sample\)/i, "") + (l.city ? `, ${l.city}` : "") }))}
                  values={{
                    type: p.type, title: p.title, description: s(p.description), locationId: s(p.locationId), sellerLocationText: s(p.sellerLocationText), localityLabel: s(p.localityLabel),
                    sellerAddress: s(p.sellerAddress), landAreaSqft: s(p.landAreaSqft), plotDimensions: s(p.plotDimensions), facing: s(p.facing), builtUpAreaSqft: s(p.builtUpAreaSqft),
                    bedrooms: s(p.bedrooms), bathrooms: s(p.bathrooms), floors: s(p.floors), accessRoad: s(p.accessRoad), approvalInfo: s(p.approvalInfo), expectedPrice: s(p.priceAmount),
                    sellerRelation: s(p.sellerRelation), name: s(p.seller?.name), phone: s(p.seller?.phone),
                  }}
                />
              </div>
            </section>
          )}
        </div>
        <aside>
          <h2 className="annot text-emerald">{d.history}</h2>
          {p.submissionEvents.length === 0 ? (
            <p className="mt-3 text-sm text-slate">{d.noHistory}</p>
          ) : (
            <ol className="mt-4 space-y-4 border-l-2 border-line pl-5">
              {p.submissionEvents.map((e) => (
                <li key={e.id} className="relative text-sm">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-ivory bg-gold" aria-hidden="true" />
                  {e.status && <p className="font-semibold text-ink">{t.market.status[e.status]}</p>}
                  {e.message && <p className="mt-0.5 whitespace-pre-line text-ink">{e.message}</p>}
                  <p className="mt-0.5 text-xs text-slate">{e.actor?.role === "CUSTOMER" || !e.actor ? d.you : d.team} · {f.dateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
