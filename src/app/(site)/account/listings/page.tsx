import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { Media } from "@/components/site/Media";
import { Breadcrumbs } from "@/components/site/ui";
import { getI18n } from "@/i18n/server";
import { requireCustomerPage } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.mine.meta, robots: { index: false } };
}

export default async function MyListings() {
  const me = await requireCustomerPage("/account/listings");
  const { t, f } = await getI18n();
  const x = t.market.mine;
  const items = await db.property.findMany({
    where: { sellerId: me.id, source: "OWNER" },
    orderBy: { createdAt: "desc" },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });
  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: t.account.dash.eyebrow, href: "/account" }, { label: x.title }]} />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline text-navy">{x.title}</h1>
          <p className="mt-2 max-w-xl text-slate">{x.intro}</p>
        </div>
        <Link href="/account/listings/new" className="btn btn-primary">{x.add}</Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-10 rounded-[1rem] border border-dashed border-line bg-white/70 p-8 text-slate">{x.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id} className="surface overflow-hidden">
              <div className="relative aspect-[16/9] bg-paper"><Media src={p.images[0]?.url ?? "placeholder:site-plan"} alt="" sizes="33vw" /></div>
              <div className="p-4">
                <p className="text-xs text-slate">{p.referenceCode} · {x.submitted(f.date(p.submittedAt ?? p.createdAt))}</p>
                <p className="mt-1 font-serif text-xl text-navy">{p.title}</p>
                <p className="mt-2 text-sm">
                  {p.publication === "PUBLISHED" ? <span className="text-emerald">{x.live}</span> : <span className="text-gold-deep">{p.submissionStatus ? t.market.status[p.submissionStatus] : ""}</span>}
                </p>
                <div className="mt-3 flex gap-4 text-sm">
                  <Link href={`/account/listings/${p.id}`} className="underline">{x.open}</Link>
                  {p.publication === "PUBLISHED" && <Link href={`/properties/${p.slug}`} className="underline">{x.view}</Link>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
