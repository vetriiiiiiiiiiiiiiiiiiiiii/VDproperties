"use client";

import type { Availability, ProjectStatus } from "@prisma/client";
import { useI18n } from "@/i18n/client";
import Link from "@/i18n/Link";
import { InkSun } from "./brand/InkSun";
import { absoluteUrl } from "@/lib/site";

export function JsonLd({ data }: { data: object }) {
  // Escape "<" so content can never close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const { t, href } = useI18n();
  const all = [{ label: t.homeNav, href: "/" }, ...items];
  return (
    <>
      <nav aria-label={t.breadcrumb} className="text-xs text-slate">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {all.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-gold">/</span>}
              {item.href && i < all.length - 1 ? (
                <Link href={item.href} className="rounded-full px-1 hover:text-emerald">{item.label}</Link>
              ) : (
                <span aria-current="page" className="font-semibold text-ink">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.label, ...(item.href && { item: absoluteUrl(href(item.href)) }) })),
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
  const { t } = useI18n();
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${AVAILABILITY_STYLE[value]}`}>{t.labels.availability[value]}</span>;
}

export function ProjectStatusBadge({ value }: { value: ProjectStatus }) {
  const { t } = useI18n();
  const style = value === "COMPLETED" ? "bg-emerald/12 text-emerald" : value === "ONGOING" ? "bg-gold/20 text-gold-deep" : "bg-navy/10 text-navy";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${style}`}>{t.labels.projectStatus[value]}</span>;
}

export function SampleTag({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={`inline-block rounded-full border border-dashed border-terracotta bg-white/90 px-2.5 py-1 text-[0.68rem] font-semibold text-terracotta-deep ${className}`} title={t.sampleTagTitle}>
      {t.sampleTag}
    </span>
  );
}

/** Page header: hand-drawn sun + leaf-wave base, with breadcrumbs and an intro panel. */
export function PageIntro({ eyebrow, title, children, crumbs }: { eyebrow: string; title: string; children?: React.ReactNode; crumbs: { label: string; href?: string }[] }) {
  return (
    <section className="relative overflow-hidden">
      {!children && <InkSun className="pointer-events-none absolute -top-2 right-4 hidden w-64 md:block lg:right-[6%] lg:w-72" />}
      <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full">
        <path fill="#8CBF26">
          <animate attributeName="d" dur="12s" repeatCount="indefinite" values="M0 40 C 360 6, 760 10, 1080 30 S 1380 46, 1440 26 L1440 60 L0 60 Z;M0 32 C 380 18, 720 2, 1060 22 S 1400 40, 1440 34 L1440 60 L0 60 Z;M0 40 C 360 6, 760 10, 1080 30 S 1380 46, 1440 26 L1440 60 L0 60 Z" />
        </path>
        <path fill="#2C7A1E" stroke="#FDFAF3" strokeWidth="2">
          <animate attributeName="d" dur="9s" repeatCount="indefinite" values="M0 50 C 400 24, 820 30, 1140 44 S 1400 52, 1440 44 L1440 60 L0 60 Z;M0 46 C 380 36, 840 22, 1120 38 S 1420 50, 1440 48 L1440 60 L0 60 Z;M0 50 C 400 24, 820 30, 1140 44 S 1400 52, 1440 44 L1440 60 L0 60 Z" />
        </path>
      </svg>
      <div className="wrap relative grid gap-8 pb-20 pt-8 lg:grid-cols-12 lg:pb-24 lg:pt-12">
        <div className="lg:col-span-12">
          <Breadcrumbs items={crumbs} />
        </div>
        <div className="lg:col-span-7">
          <p className="annot text-emerald">{eyebrow}</p>
          <h1 className="mt-4 text-headline text-navy">{title}</h1>
        </div>
        {children && <div className="self-end border-l-2 border-gold pl-5 text-lg leading-relaxed text-slate lg:col-span-5">{children}</div>}
      </div>
    </section>
  );
}
