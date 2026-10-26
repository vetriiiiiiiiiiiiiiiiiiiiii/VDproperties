import type { Metadata } from "next";
import { PolicyBody } from "@/components/site/PolicyBody";
import { PageIntro } from "@/components/site/ui";
import { alternates, getI18n } from "@/i18n/server";
import { defaultPrivacy } from "@/lib/policies";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.pages.legal.privacy, alternates: await alternates("/privacy") };
}

export default async function PrivacyPage() {
  const [s, { t, locale }] = await Promise.all([getSettings(), getI18n()]);
  return (
    <>
      <PageIntro eyebrow={t.pages.legal.eyebrow} title={t.pages.legal.privacy} crumbs={[{ label: t.pages.legal.privacy }]} />
      <PolicyBody text={s.privacyPolicy ?? defaultPrivacy(s.businessName, s.email, locale)} updated={s.updatedAt} />
    </>
  );
}
