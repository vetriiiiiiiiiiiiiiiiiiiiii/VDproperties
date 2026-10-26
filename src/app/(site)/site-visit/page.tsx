import type { Metadata } from "next";
import { SiteVisitForm } from "@/components/forms/SiteVisitForm";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { getVisitableOptions } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { VISIT_WINDOW_DAYS } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.visit.meta, description: t.pages.visit.desc, alternates: await alternates("/site-visit") };
}

export default async function SiteVisitPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const [s, opts, sp, { t }] = await Promise.all([getSettings(), getVisitableOptions(), searchParams, getI18n()]);
  const v = t.pages.visit;
  const options = {
    properties: opts.properties.map((p) => ({ value: `p:${p.id}`, label: `${p.title} (${p.referenceCode})` })),
    projects: opts.projects.map((p) => ({ value: `j:${p.id}`, label: p.name })),
  };
  const preselect = sp.for && [...options.properties, ...options.projects].some((o) => o.value === sp.for) ? sp.for : undefined;

  return (
    <>
      <PageIntro eyebrow={v.eyebrow} title={v.title} crumbs={[{ label: v.crumbContact, href: "/contact" }, { label: v.crumb }]}>
        {v.intro}
      </PageIntro>
      <div className="wrap grid gap-12 py-14 lg:grid-cols-12">
        <ol className="space-y-6 lg:col-span-4">
          {v.steps.map(([title, b], i) => (
            <li key={title} className="grid grid-cols-[3rem_1fr] items-start pt-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy font-mono text-sm text-navy">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1 text-sm text-slate">{b}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="surface p-6 sm:p-10 lg:col-span-7 lg:col-start-6">
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
