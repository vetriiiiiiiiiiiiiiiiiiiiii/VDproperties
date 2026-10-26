import type { Metadata } from "next";
import { PolicyBody } from "@/components/site/PolicyBody";
import { PageIntro } from "@/components/site/ui";
import { defaultPrivacy } from "@/lib/policies";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <>
      <PageIntro eyebrow="Legal" title="Privacy policy" crumbs={[{ label: "Privacy policy" }]} />
      <PolicyBody text={s.privacyPolicy ?? defaultPrivacy(s.businessName, s.email)} updated={s.updatedAt} />
    </>
  );
}
