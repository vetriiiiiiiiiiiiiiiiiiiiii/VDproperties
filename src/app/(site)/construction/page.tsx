import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { alternates, getI18n } from "@/i18n/server";
import { ConstructionForm } from "@/components/forms/ConstructionForm";
import { Media } from "@/components/site/Media";
import { Breadcrumbs } from "@/components/site/ui";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.construction.meta, description: t.pages.construction.desc, alternates: await alternates("/construction") };
}

export default async function ConstructionPage() {
  const [s, { t }] = await Promise.all([getSettings(), getI18n()]);
  const c = t.pages.construction;
  const completed = await db.project.findMany({
    where: { publication: "PUBLISHED", status: "COMPLETED" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    take: 3,
  });
  const faqs = s.faqs.filter((f) => /build|construct|house|home|கட்ட|வீடு/i.test(f.question));

  return (
    <>
      <section className="grid lg:grid-cols-12">
        <div className="wrap flex flex-col justify-center py-12 lg:col-span-6 lg:py-20 lg:pr-12">
          <Breadcrumbs items={[{ label: c.crumb }]} />
          <p className="annot mt-10 text-emerald">{c.eyebrow}</p>
          <h1 className="mt-4 text-display text-navy">{c.title}</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate">
            {s.constructionNotes ?? c.fallback}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#enquire" className="btn btn-primary">{c.start}</a>
            <Link href="/plots" className="btn btn-outline text-navy">{c.findLand}</Link>
          </div>
        </div>
        <div className="relative m-2 min-h-[20rem] overflow-hidden rounded-[1.5rem] lg:col-span-6">
          <Media src={s.homesImageUrl ?? "placeholder:construction"} alt={s.homesImageAlt ?? c.imageAlt} priority sizes="(min-width:1024px) 50vw, 100vw" tone="navy" />
        </div>
      </section>

      {s.constructionServices.length > 0 && (
        <section className="py-20" aria-labelledby="svc-h">
          <div className="wrap grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="annot text-emerald">{c.offerEyebrow}</p>
              <h2 id="svc-h" className="mt-4 text-headline text-navy">{c.services}</h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {s.constructionServices.map((svc) => (
                <li key={svc.title} className="surface p-6 lg:p-8" data-reveal>
                  <h3 className="text-2xl text-ink">{svc.title}</h3>
                  <p className="mt-3 text-slate">{svc.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {s.constructionStages.length > 0 && (
        <section className="survey-grid mx-2 rounded-[1.5rem] bg-forest py-20 text-ivory sm:mx-4" aria-labelledby="stages-h">
          <div className="wrap">
            <p className="annot text-gold">{c.howEyebrow}</p>
            <h2 id="stages-h" className="mt-4 text-headline">{c.stagesTitle}</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {s.constructionStages.map((st, i) => (
                <li key={st.title} className="border-t border-gold pt-5" data-reveal>
                  <span className="font-mono text-sm text-gold">{c.stage(String(i + 1).padStart(2, "0"))}</span>
                  <h3 className="mt-3 text-2xl">{st.title}</h3>
                  <p className="mt-2 text-ivory/80">{st.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="py-20" aria-labelledby="gal-h">
          <div className="wrap">
            <div className="flex items-end justify-between">
              <h2 id="gal-h" className="text-headline text-navy">{c.completedWork}</h2>
              <Link href="/projects/completed" className="link-arrow text-emerald">{c.allCompleted}</Link>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-3">
              {completed.map((c) => (
                <li key={c.id}>
                  <Link href={`/projects/${c.slug}`} className="group block">
                    <div className="blob-mask relative aspect-[4/3]">
                      <Media src={c.images[0]?.url} alt={c.images[0]?.alt ?? c.name} sizes="33vw" />
                    </div>
                    <p className="mt-3 font-serif text-xl text-navy group-hover:text-emerald">{c.name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section id="enquire" className="py-20" aria-labelledby="cform-h">
        <div className="wrap grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="annot text-emerald">{c.formEyebrow}</p>
            <h2 id="cform-h" className="mt-4 text-headline text-navy">{c.formTitle}</h2>
            <p className="mt-5 text-slate">{c.formIntro}</p>
            <p className="mt-4 text-sm text-slate">{c.formNote}</p>
            {faqs.length > 0 && (
              <dl className="mt-10 space-y-6 border-t border-line pt-6">
                {faqs.map((f) => (
                  <div key={f.question}>
                    <dt className="font-semibold text-ink">{f.question}</dt>
                    <dd className="mt-1 text-sm text-slate">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="surface p-6 sm:p-8 lg:col-span-7 lg:col-start-6">
            <ConstructionForm businessName={s.businessName} />
          </div>
        </div>
      </section>
    </>
  );
}
