import type { Metadata } from "next";
import Link from "next/link";
import { Media } from "@/components/site/Media";
import { PageIntro } from "@/components/site/ui";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About V D Properties",
  description: "V D Properties sells residential plots and land, develops properties and builds homes.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const s = await getSettings();
  const areas = await db.location.findMany({ where: { isServiceArea: true }, orderBy: { name: "asc" }, select: { name: true, city: true } });
  const sections = [
    ["Our approach", s.aboutApproach],
    ["What we value", s.aboutValues],
    ["Working with customers", s.aboutCustomers],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <PageIntro eyebrow="About" title={`About ${s.businessName}`} crumbs={[{ label: "About" }]}>
        Land, development and homes — {s.tagline.toLowerCase()}.
      </PageIntro>

      <section className="wrap grid gap-12 py-16 lg:grid-cols-12 lg:py-24">
        <div className="relative aspect-[4/5] lg:col-span-5" data-reveal="clip">
          <Media src={s.aboutImageUrl ?? "placeholder:site-plan"} alt={s.aboutImageAlt ?? "Site plan drawing of a residential layout"} sizes="(min-width:1024px) 40vw, 100vw" />
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="annot text-emerald">Who we are</p>
          {s.aboutIntro ? (
            <div className="mt-6 space-y-5 font-serif text-2xl leading-snug text-ink">
              {s.aboutIntro.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          ) : (
            <p className="mt-6 font-serif text-2xl leading-snug text-ink">
              {s.businessName} sells residential plots and land, develops properties, and builds and sells houses.
            </p>
          )}
          {sections.map(([title, body]) => (
            <div key={title} className="mt-12 border-t border-line pt-6">
              <h2 className="text-3xl text-navy">{title}</h2>
              <div className="prose-vd mt-4">
                {body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(areas.length > 0 || s.aboutServiceArea) && (
        <section className="survey-grid bg-navy py-16 text-ivory" aria-labelledby="area-h">
          <div className="wrap grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="annot text-gold">Service area</p>
              <h2 id="area-h" className="mt-4 text-4xl">Where we work</h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              {s.aboutServiceArea && <p className="text-lg text-ivory/85">{s.aboutServiceArea}</p>}
              {areas.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <li key={a.name} className="border border-ivory/25 px-3 py-1.5 text-sm">{a.name}{a.city ? `, ${a.city}` : ""}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {s.registrationInfo && (
        <section className="wrap py-16">
          <div className="grid gap-6 border-y border-line py-10 lg:grid-cols-12">
            <h2 className="annot text-emerald lg:col-span-4">Registration & credentials</h2>
            <p className="whitespace-pre-line text-ink lg:col-span-8">{s.registrationInfo}</p>
          </div>
        </section>
      )}

      <section className="wrap pb-20">
        <div className="flex flex-col items-start gap-6 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-3xl text-navy">Let's talk about what you're planning.</p>
          <Link href="/contact" className="btn btn-primary">Contact us</Link>
        </div>
      </section>
    </>
  );
}
