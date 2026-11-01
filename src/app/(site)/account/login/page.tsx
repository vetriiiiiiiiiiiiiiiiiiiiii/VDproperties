import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerLoginForm } from "@/components/account/AuthForms";
import { getI18n } from "@/i18n/server";
import { GoogleSignIn } from "@/components/account/GoogleSignIn";
import { isGoogleConfigured } from "@/lib/google-auth";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.auth.loginMeta, robots: { index: false } };
}

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; error?: string }> }) {
  const { t, href } = await getI18n();
  const a = t.account.auth;
  const { next = href("/account"), reset, error } = await searchParams;
  const m = t.market.auth;
  const googleError = error === "google-staff" ? m.googleStaff : error === "google-unverified" ? m.googleUnverified : error === "google-failed" ? m.googleFailed : null;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "CUSTOMER" ? href("/account") : "/admin");
  return (
    <div className="wrap grid gap-10 py-16 lg:grid-cols-2">
      <div>
        <p className="annot text-emerald">{a.eyebrow}</p>
        <h1 className="mt-4 text-headline text-navy">{a.loginTitle}</h1>
        <p className="mt-3 max-w-md text-slate">{a.loginIntro}</p>
        {googleError && <p role="alert" className="mt-4 max-w-md border-l-4 border-terracotta bg-white p-3 text-sm">{googleError}</p>}
        {reset && <p role="status" className="mt-4 max-w-md border-l-4 border-emerald bg-white p-3 text-sm">{t.market.auth.resetDone}</p>}
      </div>
      <div className="glass max-w-md rounded-[1rem] p-6 sm:p-8">{isGoogleConfigured() && <GoogleSignIn next={next} />}<CustomerLoginForm next={next} /></div>
    </div>
  );
}
