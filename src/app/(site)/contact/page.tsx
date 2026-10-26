import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { alternates, getI18n } from "@/i18n/server";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { PageIntro } from "@/components/site/ui";
import { phoneHref, whatsappHref } from "@/lib/format";
import { getSettings, officeAddress } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.contact.meta, description: t.pages.contact.desc, alternates: await alternates("/contact") };
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const s = await getSettings();
  const { t } = await getI18n();
  const c = t.pages.contact;
  const { type } = await searchParams;
  const defaultType = type === "plot" ? "PLOT" : type === "house" ? "HOUSE" : "GENERAL";
  const address = officeAddress(s);
  const hasAny = s.phone || s.email || s.whatsapp || address;

  return (
    <>
      <PageIntro eyebrow={c.eyebrow} title={c.title} crumbs={[{ label: c.crumb }]}>
        {c.intro}
      </PageIntro>

      <div className="wrap grid gap-12 py-14 lg:grid-cols-12 lg:py-20">
        <aside className="space-y-10 lg:col-span-4">
          <section aria-labelledby="direct-h">
            <h2 id="direct-h" className="annot text-emerald">{c.direct}</h2>
            {hasAny ? (
              <ul className="surface mt-5 divide-y divide-line px-5">
                {s.phone && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">{c.phone}</p>
                    <a href={`tel:${phoneHref(s.phone)}`} className="mt-1 block font-serif text-2xl text-navy hover:text-emerald">{s.phone}</a>
                  </li>
                )}
                {s.whatsapp && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">{c.whatsapp}</p>
                    <a href={whatsappHref(s.whatsapp, c.whatsappText)} target="_blank" rel="noopener noreferrer" className="mt-1 block font-serif text-2xl text-emerald">{c.whatsappCta}</a>
                  </li>
                )}
                {s.email && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">{c.email}</p>
                    <a href={`mailto:${s.email}`} className="mt-1 block break-all text-lg text-navy hover:text-emerald">{s.email}</a>
                  </li>
                )}
                {address && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">{c.office}</p>
                    <address className="mt-1 not-italic text-ink">{address}</address>
                    {s.officeMapUrl && /^https:\/\//.test(s.officeMapUrl) && (
                      <a href={s.officeMapUrl} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm text-navy">{c.directions}</a>
                    )}
                  </li>
                )}
                {s.businessHours && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">{c.hours}</p>
                    <p className="mt-1 whitespace-pre-line text-ink">{s.businessHours}</p>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-5 rounded-[1rem] border border-dashed border-line bg-white/70 p-5 text-slate">{c.none}</p>
            )}
          </section>

          <section id="visit" className="relative overflow-hidden rounded-[1rem] bg-forest p-6 text-ivory" aria-labelledby="visit-h">
            <div className="relative">
            <p className="annot text-gold">{c.visitEyebrow}</p>
            <h2 id="visit-h" className="mt-3 text-3xl">{c.visitTitle}</h2>
            <p className="mt-3 text-ivory/80">{c.visitBody}</p>
            <Link href="/site-visit" className="btn btn-gold mt-6 w-full">{c.visitCta}</Link>
            </div>
          </section>
        </aside>

        <section id="enquire" className="surface scroll-mt-28 p-6 sm:p-10 lg:col-span-7 lg:col-start-6" aria-labelledby="form-h">
          <p className="annot text-emerald">{c.formEyebrow}</p>
          <h2 id="form-h" className="mt-3 text-4xl text-navy">{c.formTitle}</h2>
          <p className="mt-3 text-slate">
            {c.formIntroA}{" "}
            <Link href="/construction#enquire" className="underline">{c.formIntroLink}</Link> {c.formIntroB}
          </p>
          <div className="mt-8">
            <EnquiryForm chooseType defaultType={defaultType} businessName={s.businessName} />
          </div>
        </section>
      </div>
    </>
  );
}
