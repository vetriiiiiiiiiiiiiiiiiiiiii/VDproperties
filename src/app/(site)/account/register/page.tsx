import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/AuthForms";
import { getI18n } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.account.auth.registerMeta, robots: { index: false } };
}

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t, href } = await getI18n();
  const a = t.account.auth;
  const { next = href("/account") } = await searchParams;
  if (await getCurrentUser()) redirect(href("/account"));
  return (
    <div className="wrap grid gap-10 py-16 lg:grid-cols-2">
      <div>
        <p className="annot text-emerald">{a.eyebrow}</p>
        <h1 className="mt-4 text-headline text-navy">{a.registerTitle}</h1>
        <p className="mt-3 max-w-md text-slate">{a.registerIntro}</p>
      </div>
      <div className="glass max-w-md rounded-[1rem] p-6 sm:p-8"><RegisterForm next={next} /></div>
    </div>
  );
}
