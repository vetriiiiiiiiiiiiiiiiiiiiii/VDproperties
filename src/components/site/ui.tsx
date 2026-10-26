import Link from "next/link";
import type { Availability, ProjectStatus } from "@prisma/client";
import { AVAILABILITY_LABEL, PROJECT_STATUS_LABEL } from "@/lib/labels";
import { absoluteUrl } from "@/lib/site";

export function JsonLd({ data }: { data: object }) {
  // Escape "<" so content can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="annot-plain text-slate">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {all.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="text-gold">/</span>}
              {item.href && i < all.length - 1 ? (
                <Link href={item.href} className="hover:text-emerald">{item.label}</Link>
              ) : (
                <span aria-current="page" className="text-ink">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.label,
            ...(item.href && { item: absoluteUrl(item.href) }),
          })),
        }}
      />
    </>
  );
}

const AVAILABILITY_STYLE: Record<Availability, string> = {
  AVAILABLE: "bg-emerald text-ivory",
  RESERVED: "bg-gold text-ink",
  SOLD: "bg-terracotta-deep text-ivory",
  UNAVAILABLE: "bg-slate text-ivory",
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  return <span className={`annot-plain inline-block px-2 py-1 text-[0.625rem] ${AVAILABILITY_STYLE[value]}`}>{AVAILABILITY_LABEL[value]}</span>;
}

export function ProjectStatusBadge({ value }: { value: ProjectStatus }) {
  const style = value === "COMPLETED" ? "border-emerald text-emerald" : value === "ONGOING" ? "border-gold-deep text-gold-deep" : "border-navy text-navy";
  return <span className={`annot-plain inline-block border px-2 py-1 text-[0.625rem] ${style}`}>{PROJECT_STATUS_LABEL[value]}</span>;
}

export function SampleTag({ className = "" }: { className?: string }) {
  return (
    <span className={`annot-plain inline-block border border-dashed border-terracotta bg-white px-2 py-1 text-[0.625rem] text-terracotta-deep ${className}`} title="Sample content for development. Replace before launch.">
      Sample listing
    </span>
  );
}

export function PageIntro({ eyebrow, title, children, crumbs }: { eyebrow: string; title: string; children?: React.ReactNode; crumbs: { label: string; href?: string }[] }) {
  return (
    <section className="relative overflow-hidden">
      {/* Brand motif: the logo's sun with cloud streaks, setting behind a leaf wave */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-6 hidden h-72 w-72 md:block lg:right-[6%]">
        <div className="vd-sun h-full w-full rounded-full bg-sun opacity-90" />
        <div className="vd-cloud absolute left-[-20%] top-[38%] h-2.5 w-[80%] rounded-full bg-ivory" />
        <div className="vd-cloud absolute left-[30%] top-[52%] h-2 w-[70%] rounded-full bg-ivory/90" />
      </div>
      <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full">
        <path d="M0 40 C 360 6, 760 10, 1080 30 S 1380 46, 1440 26 L1440 60 L0 60 Z" fill="#8CBF26" />
        <path d="M0 50 C 400 24, 820 30, 1140 44 S 1400 52, 1440 44 L1440 60 L0 60 Z" fill="#2C7A1E" stroke="#FDFAF3" strokeWidth="2" />
      </svg>
      <div className="wrap relative grid gap-8 pb-20 pt-8 lg:grid-cols-12 lg:pb-24 lg:pt-12">
        <div className="lg:col-span-12">
          <Breadcrumbs items={crumbs} />
        </div>
        <div className="lg:col-span-7">
          <p className="annot text-emerald">{eyebrow}</p>
          <h1 className="mt-4 text-headline text-navy">{title}</h1>
        </div>
        {children && <div className="self-end text-lg leading-relaxed text-slate lg:col-span-5 lg:rounded-sm lg:bg-ivory/85 lg:p-4 lg:backdrop-blur-sm">{children}</div>}
      </div>
    </section>
  );
}
