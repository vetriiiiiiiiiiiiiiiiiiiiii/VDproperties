import type { Metadata } from "next";
import { ForgotForm } from "@/components/account/RecoveryForms";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.auth.forgotTitle, robots: { index: false } };
}

export default async function Forgot() {
  const { t } = await getI18n();
  const a = t.market.auth;
  return (
    <div className="wrap grid gap-10 py-16 lg:grid-cols-2">
      <div>
        <h1 className="text-headline text-navy">{a.forgotTitle}</h1>
        <p className="mt-3 max-w-md text-slate">{a.forgotIntro}</p>
      </div>
      <div className="surface max-w-md p-6 sm:p-8"><ForgotForm /></div>
    </div>
  );
}
