import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerLoginForm } from "@/components/account/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/account" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.role === "CUSTOMER" ? "/account" : "/admin");
  return (
    <div className="wrap grid gap-10 py-16 lg:grid-cols-2">
      <div>
        <p className="annot text-emerald">Your account</p>
        <h1 className="mt-4 text-headline text-navy">Sign in</h1>
        <p className="mt-3 max-w-md text-slate">Your shortlist, saved home designs, comparisons, enquiries — and, if we're building for you, your BuildTrace project.</p>
      </div>
      <div className="max-w-md border border-line bg-white p-6 sm:p-8"><CustomerLoginForm next={next} /></div>
    </div>
  );
}
