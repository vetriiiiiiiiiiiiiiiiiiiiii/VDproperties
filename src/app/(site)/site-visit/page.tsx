import type { Metadata } from "next";
import { SiteVisitForm } from "@/components/forms/SiteVisitForm";
import { PageIntro } from "@/components/site/ui";
import { getVisitableOptions } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { VISIT_WINDOW_DAYS } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a Site Visit",
  description: "Request a visit to a V D Properties plot, home or project. Our team will call you to confirm a time.",
  alternates: { canonical: "/site-visit" },
};

export default async function SiteVisitPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const [s, opts, sp] = await Promise.all([getSettings(), getVisitableOptions(), searchParams]);
  const options = {
    properties: opts.properties.map((p) => ({ value: `p:${p.id}`, label: `${p.title} (${p.referenceCode})` })),
    projects: opts.projects.map((p) => ({ value: `j:${p.id}`, label: p.name })),
  };
  const preselect = sp.for && [...options.properties, ...options.projects].some((o) => o.value === sp.for) ? sp.for : undefined;

  return (
    <>
      <PageIntro eyebrow="Site visits" title="Request a site visit" crumbs={[{ label: "Contact", href: "/contact" }, { label: "Site visit" }]}>
        Choose what you'd like to see and when suits you. Our team will call to confirm — your visit is booked only once we've agreed a time together.
      </PageIntro>
      <div className="wrap grid gap-12 py-14 lg:grid-cols-12">
        <ol className="space-y-6 lg:col-span-4">
          {[
            ["Send a request", "Pick a property or project, a preferred date and a time range."],
            ["We call you", "Our team contacts you to confirm a time and share directions."],
            ["Visit together", "Someone from our team meets you on site to answer questions."],
          ].map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[3rem_1fr] border-t border-line pt-5">
              <span className="font-mono text-sm text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-semibold text-ink">{t}</p>
                <p className="mt-1 text-sm text-slate">{b}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="border border-line bg-white p-6 sm:p-10 lg:col-span-7 lg:col-start-6">
          <SiteVisitForm
            options={options}
            selected={preselect}
            closedWeekdays={s.visitClosedWeekdays}
            blackoutDates={s.visitBlackoutDates}
            maxDays={VISIT_WINDOW_DAYS}
            businessName={s.businessName}
          />
        </div>
      </div>
    </>
  );
}
