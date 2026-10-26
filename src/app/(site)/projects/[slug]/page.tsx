import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnquiryPanel } from "@/components/property/EnquiryPanel";
import { Gallery } from "@/components/property/Gallery";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Breadcrumbs, ProjectStatusBadge, SampleTag } from "@/components/site/ui";
import { db } from "@/lib/db";
import { phoneHref, whatsappHref } from "@/lib/format";
import { PROJECT_STATUS_LABEL } from "@/lib/labels";
import { cardInclude, getPublishedProject, toCard } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { VISIT_WINDOW_DAYS } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pr = await getPublishedProject((await params).slug);
  if (!pr) return { title: "Project not found", robots: { index: false } };
  const photo = pr.images.find((i) => !i.url.startsWith("placeholder:"));
  return {
    title: pr.seoTitle ?? pr.name,
    description: pr.seoDescription ?? pr.summary ?? `${pr.name} — a ${PROJECT_STATUS_LABEL[pr.status].toLowerCase()} project by V D Properties.`,
    alternates: { canonical: `/projects/${pr.slug}` },
    robots: pr.isSample ? { index: false } : undefined,
    openGraph: photo ? { images: [{ url: photo.url, alt: photo.alt }] } : undefined,
  };
}

export default async function ProjectPage({ params }: Props) {
  const pr = await getPublishedProject((await params).slug);
  if (!pr) notFound();
  const [settings, listings] = await Promise.all([
    getSettings(),
    db.property.findMany({ where: { projectId: pr.id, publication: "PUBLISHED" }, include: cardInclude, orderBy: [{ availability: "asc" }, { title: "asc" }] }),
  ]);
  const listPath = pr.status === "COMPLETED" ? "/projects/completed" : "/projects/ongoing";
  return (
    <article>
      <div className="wrap pb-6 pt-8">
        <Breadcrumbs items={[{ label: pr.status === "COMPLETED" ? "Completed projects" : "Ongoing projects", href: listPath }, { label: pr.name }]} />
      </div>
      <div className="wrap">
        <Gallery title={pr.name} images={pr.images.map((i) => ({ url: i.url, alt: i.alt, kind: "PHOTO" as const }))} />
      </div>
      <div className="wrap grid gap-12 py-12 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap gap-2">
            <ProjectStatusBadge value={pr.status} />
            {pr.isSample && <SampleTag />}
          </div>
          <p className="annot mt-6 text-emerald">{pr.localityLabel ?? pr.location?.name}</p>
          <h1 className="mt-3 text-headline text-navy">{pr.name}</h1>
          {pr.summary && <p className="mt-6 font-serif text-2xl leading-snug text-ink">{pr.summary}</p>}
          {pr.description && (
            <div className="prose-vd mt-6">
              {pr.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
            </div>
          )}
          {pr.highlights && (
            <section className="mt-12">
              <h2 className="annot text-emerald">Highlights</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {pr.highlights.split("\n").filter(Boolean).map((h) => (
                  <li key={h} className="py-3 text-ink">{h}</li>
                ))}
              </ul>
            </section>
          )}
          {pr.approvalInfo && (
            <section className="mt-12">
              <h2 className="annot text-emerald">Approvals & registration</h2>
              <p className="prose-vd mt-4 whitespace-pre-line">{pr.approvalInfo}</p>
            </section>
          )}
        </div>
        <aside className="lg:col-span-5 lg:col-start-8">
          <div className="lg:sticky lg:top-28">
            <EnquiryPanel
              subject={{ projectId: pr.id }}
              label={pr.name}
              noun="Project"
              canVisit
              visit={{ closedWeekdays: settings.visitClosedWeekdays, blackoutDates: settings.visitBlackoutDates, maxDays: VISIT_WINDOW_DAYS }}
              businessName={settings.businessName}
              phoneHref={settings.phone ? `tel:${phoneHref(settings.phone)}` : undefined}
              phone={settings.phone ?? undefined}
              whatsappHref={settings.whatsapp ? whatsappHref(settings.whatsapp, `Hello, I'm interested in ${pr.name}`) : undefined}
            />
          </div>
        </aside>
      </div>
      {listings.length > 0 && (
        <section className="border-t border-line bg-paper py-16" aria-labelledby="pl-h">
          <div className="wrap">
            <h2 id="pl-h" className="text-headline text-navy">Listings in {pr.name}</h2>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <li key={l.id}><PropertyCard p={toCard(l)} /></li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
