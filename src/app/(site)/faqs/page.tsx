import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, PageIntro } from "@/components/site/ui";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about buying plots and homes, site visits and construction with V D Properties.",
  alternates: { canonical: "/faqs" },
};

export default async function FaqPage() {
  const s = await getSettings();
  return (
    <>
      {s.faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          }}
        />
      )}
      <PageIntro eyebrow="Help" title="Frequently asked questions" crumbs={[{ label: "FAQs" }]} />
      <div className="wrap grid gap-12 py-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {s.faqs.length ? (
            <div className="divide-y divide-line border-y border-line">
              {s.faqs.map((f) => (
                <details key={f.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-2xl text-navy [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span aria-hidden="true" className="mt-1 text-gold transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-slate">{f.answer}</p>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-slate">Answers to common questions will appear here.</p>
          )}
        </div>
        <aside className="lg:col-span-3 lg:col-start-10">
          <p className="font-serif text-2xl text-navy">Didn't find your answer?</p>
          <Link href="/contact#enquire" className="btn btn-primary mt-5">Ask us</Link>
        </aside>
      </div>
    </>
  );
}
