import type { Metadata } from "next";
import { PolicyBody } from "@/components/site/PolicyBody";
import { PageIntro } from "@/components/site/ui";
import { defaultTerms } from "@/lib/policies";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <>
      <PageIntro eyebrow="Legal" title="Terms & conditions" crumbs={[{ label: "Terms & conditions" }]} />
      <PolicyBody text={s.termsConditions ?? defaultTerms(s.businessName)} updated={s.updatedAt} />
    </>
  );
}
