import { getI18n } from "@/i18n/server";
import Link from "@/i18n/Link";
import { phoneHref } from "@/lib/format";
import { getSettings, officeAddress } from "@/lib/settings";
import { FooterSunset } from "./brand/FooterSunset";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";

export async function Footer() {
  const [s, { t }] = await Promise.all([getSettings(), getI18n()]);
  const address = officeAddress(s);
  const year = new Date().getFullYear();
  const f = t.footer;
  return (
    <>
      <FooterSunset tagline={s.tagline} />
      <footer className="relative overflow-hidden bg-forest text-ivory">
        <div className="wrap relative grid gap-12 py-16 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-4">
            <Logo inverted />
            <p className="mt-6 max-w-sm font-serif text-3xl leading-tight">{f.tagline}</p>
            <div className="mt-6"><LanguageSwitch dark /></div>
          </div>

          <FooterCol title={f.platform} links={[[t.nav.plotfit, "/plotfit"], [t.nav.twin, "/twin"], [t.nav.studio, "/studio"], [t.nav.buildtrace, "/buildtrace"], [f.compare, "/compare"], [t.myAccount, "/account"]]} />
          <FooterCol title={f.properties} links={[[t.nav.allProperties, "/properties"], [t.nav.plots, "/plots"], [t.nav.houses, "/houses"], [t.nav.ongoing, "/projects/ongoing"], [t.nav.construction, "/construction"], [f.aboutUs, "/about"], [t.faqs, "/faqs"]]} />

          <div className="lg:col-span-3">
            <h2 className="annot text-gold-light">{f.contact}</h2>
            <address className="mt-5 space-y-3 not-italic text-ivory/85">
              {s.phone ? <p><a href={`tel:${phoneHref(s.phone)}`} className="hover:text-gold-light">{s.phone}</a></p> : null}
              {s.email ? <p><a href={`mailto:${s.email}`} className="break-all hover:text-gold-light">{s.email}</a></p> : null}
              {address ? <p>{address}</p> : null}
              {!s.phone && !s.email && !address ? (
                <p className="text-ivory/70">
                  {f.noContact} <Link href="/contact" className="underline">{f.enquiryForm}</Link>.
                </p>
              ) : null}
            </address>
            {s.socialLinks.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label={f.social}>
                {s.socialLinks.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} rel="noopener noreferrer" target="_blank" className="annot-plain text-ivory/80 hover:text-gold-light">{l.label}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="relative border-t border-ivory/10">
          <div className="wrap flex flex-col gap-3 py-6 text-sm text-ivory/70 sm:flex-row sm:items-center sm:justify-between">
            <p>{f.rights(year, s.businessName)}</p>
            <ul className="flex gap-6">
              <li><Link href="/privacy" className="hover:text-gold-light">{f.privacy}</Link></li>
              <li><Link href="/terms" className="hover:text-gold-light">{f.terms}</Link></li>
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
            <Link href={href} className="text-ivory/85 transition-colors hover:text-gold-light">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
