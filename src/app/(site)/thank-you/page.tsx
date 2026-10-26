import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.thankYou.metaTitle, robots: { index: false } };
}

export default async function ThankYou({ searchParams }: { searchParams: Promise<{ kind?: string; ref?: string; error?: string }> }) {
  const { kind, ref, error } = await searchParams;
  const { t } = await getI18n();
  const x = t.thankYou;
  const visit = kind === "visit";
  if (error) {
    return (
      <div className="wrap max-w-2xl py-24">
        <p className="annot text-terracotta">{x.notSent}</p>
        <h1 className="mt-4 text-headline text-navy">{x.notSentTitle}</h1>
        <p className="mt-4 text-slate">{x.errors[error] ?? x.fallbackError}</p>
        <Link href={visit ? "/site-visit" : "/contact#enquire"} className="btn btn-primary mt-8">{x.retry}</Link>
      </div>
    );
  }
  return (
    <div className="wrap relative max-w-2xl py-24">
      <p className="annot text-emerald">{x.received}</p>
      <h1 className="mt-4 text-headline text-navy">{x.title(visit)}</h1>
      {ref && <p className="annot-plain mt-3 text-slate">{t.forms.reference(ref.replace(/[^A-Z0-9]/gi, "").slice(0, 12))}</p>}
      <p className="mt-6 text-lg text-slate">{visit ? x.visitNote : x.enquiryNote}</p>
      <Link href="/properties" className="link-arrow mt-8 text-emerald">{x.continue}</Link>
    </div>
  );
}
