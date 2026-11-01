import type { Metadata } from "next";
import Link from "@/i18n/Link";
import { ConfirmEmailForm } from "@/components/account/RecoveryForms";
import { getI18n } from "@/i18n/server";
import { findValidToken } from "@/lib/account-links";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.market.auth.verifyTitle, robots: { index: false } };
}

/** Needs a button press: mail scanners that follow links must not confirm an address on their own. */
export default async function Verify({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { t } = await getI18n();
  const a = t.market.auth;
  const token = (await searchParams).token ?? "";
  const valid = await findValidToken(token, "EMAIL_VERIFY");
  return (
    <div className="wrap max-w-md py-16">
      <h1 className="text-headline text-navy">{a.verifyTitle}</h1>
      <div className="surface mt-6 p-6 sm:p-8">
        {valid ? (
          <>
            <p className="mb-4 text-sm text-slate">{a.verifyIntro}</p>
            <ConfirmEmailForm token={token} />
          </>
        ) : (
          <>
            <p role="alert" className="text-sm text-terracotta-deep">{a.invalidLink}</p>
            <Link href="/account" className="btn btn-primary mt-4">{a.goAccount}</Link>
          </>
        )}
      </div>
    </div>
  );
}
