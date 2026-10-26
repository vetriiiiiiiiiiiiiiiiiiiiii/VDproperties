import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.sell.meta, description: t.market.sell.desc, alternates: await alternates("/sell") };
}

export default async function SellPage() {
  const [{ t, href }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const x = t.market.sell;
  const start = "/account/listings/new";
  return (
    <>
      <PageIntro eyebrow={x.eyebrow} title={x.title} crumbs={[{ label: x.meta }]}>
        {x.intro}
      </PageIntro>
      <div className="wrap grid gap-12 py-14 lg:grid-cols-12">
        <ol className="space-y-4 lg:col-span-7">
          {x.steps.map(([title, body], i) => (
            <li key={title} className="surface grid grid-cols-[3rem_1fr] gap-2 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy font-mono text-sm text-navy">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="font-serif text-2xl text-navy">{title}</h2>
                <p className="mt-1 text-slate">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <aside className="lg:col-span-5">
          <div className="sticky top-28 rounded-[1.25rem] bg-navy p-6 text-ivory sm:p-8">
            <h2 className="font-serif text-2xl">{x.privacyTitle}</h2>
            <p className="mt-3 text-ivory/80">{x.privacy}</p>
            <p className="mt-3 text-sm text-ivory/70">{x.noFee}</p>
            {user?.role === "CUSTOMER" ? (
              <Link href={start} className="btn btn-gold mt-6 w-full">{x.cta}</Link>
            ) : (
              <>
                <p className="mt-6 text-sm text-ivory/85">{x.signInFirst}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/account/register?next=${encodeURIComponent(href(start))}`} className="btn btn-gold">{x.register}</Link>
                  <Link href={`/account/login?next=${encodeURIComponent(href(start))}`} className="btn btn-outline">{x.signIn}</Link>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
