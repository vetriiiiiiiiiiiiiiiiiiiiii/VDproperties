import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { AVAILABILITY_LABEL, HOME_TYPES, LAND_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/labels";

export const metadata = { title: "Properties" };

type SP = { q?: string; publication?: string; availability?: string; group?: string; sample?: string; deleted?: string };

export default async function AdminProperties({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePage("properties:manage");
  const sp = await searchParams;
  const where: Prisma.PropertyWhereInput = {
    ...(sp.q && { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { referenceCode: { contains: sp.q, mode: "insensitive" } }] }),
    ...(sp.publication === "PUBLISHED" || sp.publication === "DRAFT" ? { publication: sp.publication } : {}),
    ...(["AVAILABLE", "RESERVED", "SOLD", "UNAVAILABLE"].includes(sp.availability ?? "") && { availability: sp.availability as "AVAILABLE" }),
    ...(sp.group === "land" && { type: { in: LAND_TYPES } }),
    ...(sp.group === "homes" && { type: { in: HOME_TYPES } }),
    ...(sp.sample === "1" && { isSample: true }),
  };
  const items = await db.property.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { location: { select: { name: true } }, _count: { select: { images: true, enquiries: true } } },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Properties" description={`${items.length} shown`} actions={<Link href="/admin/properties/new" className="btn btn-primary min-h-10 text-sm">Add property</Link>} />
      {sp.deleted && <Notice tone="ok">Property deleted. Its enquiries have been kept.</Notice>}
      <form className="mb-6 grid gap-3 border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search title or property ID" aria-label="Search properties" className="field" />
        <select name="publication" defaultValue={sp.publication ?? ""} aria-label="Publication" className="field">
          <option value="">Draft & published</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
        <select name="availability" defaultValue={sp.availability ?? ""} aria-label="Availability" className="field">
          <option value="">Any availability</option>
          {Object.entries(AVAILABILITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select name="group" defaultValue={sp.group ?? ""} aria-label="Category" className="field">
          <option value="">All types</option>
          <option value="land">Plots & land</option>
          <option value="homes">Houses & villas</option>
        </select>
        <button className="btn btn-outline min-h-11 text-sm text-navy">Filter</button>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-5">
          <input type="checkbox" name="sample" value="1" defaultChecked={sp.sample === "1"} className="accent-emerald" /> Sample listings only
        </label>
      </form>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr>
              <th scope="col" className="px-4 py-3">Property</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Price</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Images</th>
              <th scope="col" className="px-4 py-3">Enquiries</th>
              <th scope="col" className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-ivory">
                <td className="px-4 py-3">
                  <Link href={`/admin/properties/${p.id}`} className="font-semibold text-navy hover:text-emerald">{p.title}</Link>
                  <span className="block text-xs text-slate">
                    {p.referenceCode}{p.location ? ` · ${p.location.name}` : ""}{p.featured ? " · ★ Featured" : ""}{p.isSample ? " · Sample" : ""}
                  </span>
                </td>
                <td className="px-4 py-3">{PROPERTY_TYPE_LABEL[p.type]}</td>
                <td className="px-4 py-3">{p.priceDisplay === "CONTACT_FOR_PRICE" ? <span className="text-slate">On request</span> : p.priceAmount !== null ? formatPrice(Number(p.priceAmount)) : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`mr-1 inline-block px-1.5 py-0.5 text-xs ${p.publication === "PUBLISHED" ? "bg-emerald text-ivory" : "bg-paper text-slate"}`}>{p.publication === "PUBLISHED" ? "Published" : "Draft"}</span>
                  <span className="text-xs">{AVAILABILITY_LABEL[p.availability]}</span>
                </td>
                <td className="px-4 py-3">{p._count.images || <span className="text-terracotta-deep">0</span>}</td>
                <td className="px-4 py-3">{p._count.enquiries}</td>
                <td className="px-4 py-3 text-slate">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate">No properties match. <Link href="/admin/properties/new" className="underline">Add the first one</Link>.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
