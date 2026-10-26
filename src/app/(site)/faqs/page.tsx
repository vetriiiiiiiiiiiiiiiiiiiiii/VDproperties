import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { alternates, getI18n } from "@/i18n/server";
import { JsonLd, PageIntro } from "@/components/site/ui";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.faqs.meta, description: t.pages.faqs.desc, alternates: await alternates("/faqs") };
}

export default async function FaqPage() {
  const [s, { t }] = await Promise.all([getSettings(), getI18n()]);
  const x = t.pages.faqs;
  const faqs = s.faqs;
  return (
    <>
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          }}
        />
      )}
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.crumb }]} />
      <div className="wrap grid gap-12 py-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {faqs.length ? (
            <div className="space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="surface group px-6 py-5 transition-[border-radius] duration-500 open:rounded-[2.25rem_1.5rem_2rem_1.25rem]">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-2xl text-navy [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span aria-hidden="true" className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-gold transition-transform duration-500 group-open:rotate-45 group-open:bg-gold group-open:text-white">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-slate">{f.answer}</p>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-slate">{x.empty}</p>
          )}
        </div>
        <aside className="lg:col-span-3 lg:col-start-10">
          <p className="font-serif text-2xl text-navy">{x.notFound}</p>
          <Link href="/contact#enquire" className="btn btn-primary mt-5">{x.ask}</Link>
        </aside>
      </div>
    </>
  );
}
