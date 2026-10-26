import type { Metadata } from "next";
import Link from "next/link";
import { Media } from "@/components/site/Media";
import { AvailabilityBadge, Breadcrumbs, SampleTag } from "@/components/site/ui";
import { db } from "@/lib/db";
import { formatArea, formatPrice } from "@/lib/format";
import { PROPERTY_TYPE_LABEL } from "@/lib/labels";
import { completeness, plotFromProperty } from "@/lib/platform";
import { DEFAULT_INPUTS, generateLayout } from "@/lib/studio/layout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Compare properties", robots: { index: false } };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
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
    ["Status", (p) => <AvailabilityBadge value={p.availability} />],
    ["Type", (p) => PROPERTY_TYPE_LABEL[p.type]],
    ["Location", (p) => p.localityLabel ?? p.location?.name ?? "—"],
    ["Price", (p) => (p.publicPrice !== null ? formatPrice(Number(p.publicPrice)) : "On request")],
    ["Plot area", (p) => (p.landAreaSqft ? formatArea(p.landAreaSqft) : "—")],
    ["Dimensions", (p) => (p.plotWidthFt && p.plotDepthFt ? `${p.plotWidthFt} × ${p.plotDepthFt} ft` : (p.plotDimensions ?? "—"))],
    ["Built-up", (p) => (p.builtUpAreaSqft ? formatArea(p.builtUpAreaSqft) : "—")],
    [
      "Concept fit (3 bed, 2 floors)",
      (p) => {
        const plot = plotFromProperty(p);
        if (!plot) return <span className="text-slate">Dimensions needed</span>;
        const r = generateLayout(plot, DEFAULT_INPUTS);
        return <span className={r.feasible ? "text-emerald" : "text-terracotta-deep"}>{r.achievedBuiltUpSqft.toLocaleString("en-IN")} sq ft {r.feasible ? "fits" : "— doesn't fit"}{plot.setbackSource === "ASSUMED" ? " (assumed setbacks)" : ""}</span>;
      },
    ],
    ["Known constraints", (p) => p.siteConstraints ?? "None recorded"],
    ["Documents reviewed", (p) => (p.passport.length ? `${p.passport.filter((x) => x.status === "REVIEWED").length} of ${p.passport.length}` : "No register yet")],
    ["Record completeness", (p) => `${Math.round(completeness(p as unknown as Record<string, unknown>) * 100)}%`],
    [
      "Missing information",
      (p) => {
        const missing = [!p.plotWidthFt && "dimensions", p.publicPrice === null && "price", !p.accessRoad && "road access", !p.utilities && "utilities", !(p.showExactLocation && p.latitude) && "exact location"].filter(Boolean);
        return missing.length ? <span className="text-slate">{missing.join(", ")}</span> : "—";
      },
    ],
  ];

  return (
    <div className="wrap py-10">
      <Breadcrumbs items={[{ label: "Compare properties" }]} />
      <h1 className="mt-6 text-headline text-navy">Compare properties</h1>
      <p className="mt-2 max-w-2xl text-slate">Side by side, using only what's on record. Gaps are shown as gaps.</p>

      <form action="/compare" method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <input type="hidden" name="p" value={slugs.join(",")} />
        <label className="text-sm">
          Add a property
          <select name="add" className="field mt-1 min-w-[16rem]" defaultValue="" disabled={slugs.length >= 4}>
            <option value="" disabled>Choose…</option>
            {options.map((o) => <option key={o.slug} value={o.slug}>{o.referenceCode} · {o.title}</option>)}
          </select>
        </label>
        <button formAction="/compare/add" className="btn btn-primary min-h-11" disabled={slugs.length >= 4}>Add</button>
      </form>

      {props.length === 0 ? (
        <p className="mt-10 border border-dashed border-line bg-white p-8 text-slate">Add properties to compare — or pick them from your <Link href="/plotfit" className="underline">PlotFit matches</Link>.</p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-48 p-4" />
                {props.map((p) => (
                  <th key={p.id} scope="col" className="min-w-[13rem] border-l border-line p-4 align-top font-normal">
                    <div className="relative mb-3 aspect-[4/3] overflow-hidden bg-paper"><Media src={p.images[0]?.url} alt="" sizes="220px" /></div>
                    <Link href={`/twin/${p.slug}`} className="font-serif text-xl text-navy hover:text-emerald">{p.title}</Link>
                    <p className="text-xs text-slate">{p.referenceCode}</p>
                    {p.isSample && <SampleTag className="mt-1" />}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {plotFromProperty(p) && <Link href={`/studio/${p.slug}`} className="underline">Studio</Link>}
                      <Link href={link(slugs.filter((s) => s !== p.slug))} className="text-terracotta-deep underline">Remove</Link>
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
