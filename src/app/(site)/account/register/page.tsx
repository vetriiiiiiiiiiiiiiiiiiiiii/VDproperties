import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/account" } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="wrap grid gap-10 py-16 lg:grid-cols-2">
      <div>
        <p className="annot text-emerald">Your account</p>
        <h1 className="mt-4 text-headline text-navy">Create an account</h1>
        <p className="mt-3 max-w-md text-slate">Save properties and home-design scenarios, compare them side by side and keep track of your enquiries. We only email you about listings if you ask us to.</p>
      </div>
      <div className="max-w-md border border-line bg-white p-6 sm:p-8"><RegisterForm next={next} /></div>
    </div>
  );
}
