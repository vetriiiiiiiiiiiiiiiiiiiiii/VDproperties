import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { ResetForm } from "@/components/account/RecoveryForms";
import { getI18n } from "@/i18n/server";
import { findValidToken } from "@/lib/account-links";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.auth.resetTitle, robots: { index: false } };
}

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { t } = await getI18n();
  const a = t.market.auth;
  const token = (await searchParams).token ?? "";
  const valid = await findValidToken(token, "PASSWORD_RESET");
  return (
    <div className="wrap max-w-md py-16">
      <h1 className="text-headline text-navy">{a.resetTitle}</h1>
      <div className="surface mt-6 p-6 sm:p-8">
        {valid ? <ResetForm token={token} /> : (
          <>
            <p role="alert" className="text-sm text-terracotta-deep">{a.invalidLink}</p>
            <Link href="/account/forgot" className="btn btn-primary mt-4">{a.requestNew}</Link>
          </>
        )}
      </div>
    </div>
  );
}
