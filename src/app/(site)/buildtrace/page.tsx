import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { alternates, getI18n } from "@/i18n/server";
import { PageIntro } from "@/components/site/ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.build.meta, description: t.account.build.desc, alternates: await alternates("/buildtrace") };
}

export default async function BuildTraceLanding() {
  const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
  const b = t.account.build;
  return (
    <>
      <PageIntro eyebrow={b.eyebrow} title={b.title} crumbs={[{ label: b.eyebrow }]}>
        {b.intro}
      </PageIntro>
      <div className="wrap py-14">
        <ol className="grid gap-4 md:grid-cols-3">
          {b.features.map(([title, body], i) => (
            <li key={title} className="surface p-6" data-reveal>
              <span className="font-mono text-sm text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-3 text-2xl text-navy">{title}</h2>
              <p className="mt-2 text-slate">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href={user?.role === "CUSTOMER" ? "/account" : "/account/login?next=/account"} className="btn btn-primary">{b.track}</Link>
          <Link href="/construction#enquire" className="btn btn-gold">{b.discuss}</Link>
        </div>
        <p className="mt-6 max-w-2xl text-sm text-slate">{b.privacy}</p>
      </div>
    </>
  );
}
