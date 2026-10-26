import Link from "next/link";
import { getSettings, officeAddress } from "@/lib/settings";
import { phoneHref } from "@/lib/format";
import { Logo } from "./Logo";
import { FooterSunset } from "./brand/FooterSunset";

export async function Footer() {
  const s = await getSettings();
  const address = officeAddress(s);
  const year = new Date().getFullYear();
  return (
    <>
    <FooterSunset tagline={s.tagline} />
    <footer className="survey-grid relative overflow-hidden bg-forest text-ivory">
      <div className="wrap grid gap-12 py-16 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <Logo inverted />
          <p className="mt-6 max-w-sm font-serif text-3xl leading-tight">{s.tagline.charAt(0) + s.tagline.slice(1).toLowerCase()}.</p>
        </div>

        <FooterCol title="Platform" links={[["PlotFit", "/plotfit"], ["Property Twin", "/twin"], ["Property Studio", "/studio"], ["BuildTrace", "/buildtrace"], ["Compare properties", "/compare"], ["My account", "/account"]]} />
        <FooterCol title="Properties" links={[["All properties", "/properties"], ["Residential plots & land", "/plots"], ["Houses & villas", "/houses"], ["Ongoing projects", "/projects/ongoing"], ["Construction services", "/construction"], ["About us", "/about"], ["FAQs", "/faqs"]]} />

        <div className="lg:col-span-3">
          <h2 className="annot text-gold-light">Contact</h2>
          <address className="mt-5 space-y-3 not-italic text-ivory/85">
            {s.phone ? (
              <p>
                <a href={`tel:${phoneHref(s.phone)}`} className="hover:text-gold-light">{s.phone}</a>
              </p>
            ) : null}
            {s.email ? (
              <p>
                <a href={`mailto:${s.email}`} className="break-all hover:text-gold-light">{s.email}</a>
              </p>
            ) : null}
            {address ? <p>{address}</p> : null}
            {!s.phone && !s.email && !address ? (
              <p className="text-ivory/70">
                Official contact details will be published here. Meanwhile, use the{" "}
                <Link href="/contact" className="underline">enquiry form</Link>.
              </p>
            ) : null}
          </address>
          {s.socialLinks.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label="Social media">
              {s.socialLinks.map((l) => (
                <li key={l.url}>
                  <a href={l.url} rel="noopener noreferrer" target="_blank" className="annot-plain text-ivory/80 hover:text-gold-light">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-ivory/15">
        <div className="wrap flex flex-col gap-3 py-6 text-sm text-ivory/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {s.businessName}. All rights reserved.</p>
          <ul className="flex gap-6">
            <li><Link href="/privacy" className="hover:text-gold-light">Privacy policy</Link></li>
            <li><Link href="/terms" className="hover:text-gold-light">Terms & conditions</Link></li>
          </ul>
        </div>
      </div>
    </footer>
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="lg:col-span-2">
      <h2 className="annot text-gold-light">{title}</h2>
      <ul className="mt-5 space-y-2.5">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-ivory/85 hover:text-gold-light">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
