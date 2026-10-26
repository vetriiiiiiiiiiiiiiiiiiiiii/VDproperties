import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { PageIntro } from "@/components/site/ui";
import { phoneHref, whatsappHref } from "@/lib/format";
import { getSettings, officeAddress } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact & Site Visits",
  description: "Contact V D Properties about a plot, a house, a construction project or a site visit.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const s = await getSettings();
  const { type } = await searchParams;
  const defaultType = type === "plot" ? "PLOT" : type === "house" ? "HOUSE" : "GENERAL";
  const address = officeAddress(s);
  const hasAny = s.phone || s.email || s.whatsapp || address;

  return (
    <>
      <PageIntro eyebrow="Contact" title="Talk to us" crumbs={[{ label: "Contact" }]}>
        Ask about a listing, tell us what you're looking for, or arrange to see a property in person.
      </PageIntro>

      <div className="wrap grid gap-12 py-14 lg:grid-cols-12 lg:py-20">
        <aside className="space-y-10 lg:col-span-4">
          <section aria-labelledby="direct-h">
            <h2 id="direct-h" className="annot text-emerald">Direct contact</h2>
            {hasAny ? (
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {s.phone && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">Phone</p>
                    <a href={`tel:${phoneHref(s.phone)}`} className="mt-1 block font-serif text-2xl text-navy hover:text-emerald">{s.phone}</a>
                  </li>
                )}
                {s.whatsapp && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">WhatsApp</p>
                    <a href={whatsappHref(s.whatsapp, "Hello, I have a property enquiry")} target="_blank" rel="noopener noreferrer" className="mt-1 block font-serif text-2xl text-emerald">Message us on WhatsApp</a>
                  </li>
                )}
                {s.email && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">Email</p>
                    <a href={`mailto:${s.email}`} className="mt-1 block break-all text-lg text-navy hover:text-emerald">{s.email}</a>
                  </li>
                )}
                {address && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">Office</p>
                    <address className="mt-1 not-italic text-ink">{address}</address>
                    {s.officeMapUrl && /^https:\/\//.test(s.officeMapUrl) && (
                      <a href={s.officeMapUrl} target="_blank" rel="noopener noreferrer" className="link-arrow mt-3 text-sm text-navy">Directions to the office</a>
                    )}
                  </li>
                )}
                {s.businessHours && (
                  <li className="py-4">
                    <p className="annot-plain text-slate">Business hours</p>
                    <p className="mt-1 whitespace-pre-line text-ink">{s.businessHours}</p>
                  </li>
                )}
              </ul>
            ) : (
              <p className="mt-5 border border-dashed border-line bg-white p-5 text-slate">Our official phone number, email and office address will be published here shortly. In the meantime, please use the form — every enquiry reaches our team.</p>
            )}
          </section>

          <section id="visit" className="border border-line bg-forest p-6 text-ivory" aria-labelledby="visit-h">
            <p className="annot text-gold">Site visits</p>
            <h2 id="visit-h" className="mt-3 text-3xl">See it in person.</h2>
            <p className="mt-3 text-ivory/80">Choose a property or project and a preferred date. We'll call to confirm a time with you.</p>
            <Link href="/site-visit" className="btn btn-gold mt-6 w-full">Request a site visit</Link>
          </section>
        </aside>

        <section id="enquire" className="scroll-mt-28 border border-line bg-white p-6 sm:p-10 lg:col-span-7 lg:col-start-6" aria-labelledby="form-h">
          <p className="annot text-emerald">Enquiry</p>
          <h2 id="form-h" className="mt-3 text-4xl text-navy">Send us a message</h2>
          <p className="mt-3 text-slate">
            We'll call you back on the number you provide. For building a house, the{" "}
            <Link href="/construction#enquire" className="underline">construction enquiry</Link> asks a few more useful questions.
          </p>
          <div className="mt-8">
            <EnquiryForm chooseType defaultType={defaultType} businessName={s.businessName} />
          </div>
        </section>
      </div>
    </>
  );
}
