import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, Breadcrumbs, SampleTag } from "@/components/site/ui";
import { db } from "@/lib/db";
import { completeness, plotFromProperty } from "@/lib/platform";
import { DEFAULT_INPUTS, generateLayout } from "@/lib/studio/layout";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.plotfit.compare.meta, robots: { index: false } };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { t, f, href } = await getI18n();
  const c = t.plotfit.compare;
  const R = c.rows;
  const slugs = [...new Set((await searchParams).p?.split(",").filter((s) => /^[a-z0-9-]{1,80}$/.test(s)) ?? [])].slice(0, 4);
  const [rows, options] = await Promise.all([
    db.property.findMany({
      where: { slug: { in: slugs }, publication: "PUBLISHED" },
      include: { location: true, images: { take: 1, orderBy: { sortOrder: "asc" }, where: { kind: "PHOTO" } }, passport: { where: { customerVisible: true }, select: { status: true } }, amenities: { select: { id: true } } },
    }),
    db.property.findMany({ where: { publication: "PUBLISHED", availability: { in: ["AVAILABLE", "RESERVED"] }, slug: { notIn: slugs } }, select: { slug: true, title: true, referenceCode: true }, orderBy: { title: "asc" } }),
  ]);
  const props = slugs.map((s) => rows.find((r) => r.slug === s)).filter((r): r is (typeof rows)[number] => !!r);
  const link = (list: string[]) => (list.length ? `/compare?p=${list.join(",")}` : "/compare");

  const rowsSpec: [string, (p: (typeof props)[number]) => React.ReactNode][] = [
    [R.status, (p) => <AvailabilityBadge value={p.availability} />],
    [R.type, (p) => t.labels.propertyType[p.type]],
    [R.location, (p) => p.localityLabel ?? p.location?.name ?? "—"],
    [R.price, (p) => (p.publicPrice !== null ? f.price(Number(p.publicPrice)) : t.price.onRequestShort)],
    [R.plotArea, (p) => (p.landAreaSqft ? f.area(p.landAreaSqft) : "—")],
    [R.dimensions, (p) => (p.plotWidthFt && p.plotDepthFt ? `${p.plotWidthFt} × ${p.plotDepthFt} ft` : (p.plotDimensions ?? "—"))],
    [R.builtUp, (p) => (p.builtUpAreaSqft ? f.area(p.builtUpAreaSqft) : "—")],
    [
      R.fit,
      (p) => {
        const plot = plotFromProperty(p);
        if (!plot) return <span className="text-slate">{c.dimsNeeded}</span>;
        const r = generateLayout(plot, DEFAULT_INPUTS);
        return <span className={r.feasible ? "text-emerald" : "text-terracotta-deep"}>{c.fits(f.area(r.achievedBuiltUpSqft), r.feasible, plot.setbackSource === "ASSUMED")}</span>;
      },
    ],
    [R.constraints, (p) => p.siteConstraints ?? c.noneRecorded],
    [R.docs, (p) => (p.passport.length ? c.docsOf(p.passport.filter((x) => x.status === "REVIEWED").length, p.passport.length) : c.noRegister)],
    [R.completeness, (p) => `${Math.round(completeness(p as unknown as Record<string, unknown>) * 100)}%`],
    [
      R.missing,
      (p) => {
        const m = c.missing;
        const missing = [!p.plotWidthFt && m.dimensions, p.publicPrice === null && m.price, !p.accessRoad && m.road, !p.utilities && m.utilities, !(p.showExactLocation && p.latitude) && m.location].filter(Boolean);
        return missing.length ? <span className="text-slate">{missing.join(", ")}</span> : "—";
      },
    ],
  ];

  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: c.title }]} />
      <h1 className="mt-6 text-headline text-navy">{c.title}</h1>
      <p className="mt-2 max-w-2xl text-slate">{c.intro}</p>

      <form action={href("/compare")} method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <input type="hidden" name="p" value={slugs.join(",")} />
        <label className="text-sm">
          {c.add}
          <select name="add" className="field mt-1 min-w-[16rem]" defaultValue="" disabled={slugs.length >= 4}>
            <option value="" disabled>{c.choose}</option>
            {options.map((o) => <option key={o.slug} value={o.slug}>{o.referenceCode} · {o.title}</option>)}
          </select>
        </label>
        <button formAction={href("/compare/add")} className="btn btn-primary min-h-11" disabled={slugs.length >= 4}>{c.addBtn}</button>
      </form>

      {props.length === 0 ? (
        <p className="mt-10 rounded-[1rem] border border-dashed border-line bg-white/70 p-8 text-slate">{c.empty} <Link href="/plotfit" className="underline">{c.emptyLink}</Link>.</p>
      ) : (
        <div className="surface mt-8 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-48 p-4" />
                {props.map((p) => (
                  <th key={p.id} scope="col" className="min-w-[13rem] border-l border-line p-4 align-top font-normal">
                    <div className="blob-mask relative mb-3 aspect-[4/3] bg-paper"><Media src={p.images[0]?.url} alt="" sizes="220px" /></div>
                    <Link href={`/twin/${p.slug}`} className="font-serif text-xl text-navy hover:text-emerald">{p.title}</Link>
                    <p className="text-xs text-slate">{p.referenceCode}</p>
                    {p.isSample && <SampleTag className="mt-1" />}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {plotFromProperty(p) && <Link href={`/studio/${p.slug}`} className="underline">{c.studio}</Link>}
                      <Link href={link(slugs.filter((s) => s !== p.slug))} className="text-terracotta-deep underline">{c.remove}</Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rowsSpec.map(([label, fn]) => (
                <tr key={label}>
                  <th scope="row" className="p-4 font-medium text-slate">{label}</th>
                  {props.map((p) => <td key={p.id} className="border-l border-line p-4">{fn(p)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
