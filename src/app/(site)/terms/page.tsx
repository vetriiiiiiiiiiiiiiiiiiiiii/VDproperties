import type { Metadata } from "next";
import { PolicyBody } from "@/components/site/PolicyBody";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { defaultTerms } from "@/lib/policies";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.legal.terms, alternates: await alternates("/terms") };
}

export default async function TermsPage() {
  const [s, { t, locale }] = await Promise.all([getSettings(), getI18n()]);
  return (
    <>
      <PageIntro eyebrow={t.pages.legal.eyebrow} title={t.pages.legal.terms} crumbs={[{ label: t.pages.legal.terms }]} />
      <PolicyBody text={s.termsConditions ?? defaultTerms(s.businessName, locale)} updated={s.updatedAt} />
    </>
  );
}
