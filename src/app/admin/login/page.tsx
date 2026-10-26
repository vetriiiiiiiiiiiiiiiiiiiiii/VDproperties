import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Illustration } from "@/components/site/Illustration";
import { Logo } from "@/components/site/Logo";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <Logo />
        <h1 className="mt-12 text-4xl text-navy">Staff sign in</h1>
        <p className="mt-2 text-slate">For authorised V D Properties team members only.</p>
        <div className="mt-8 max-w-sm">
          <LoginForm />
        </div>
      </div>
      <div className="relative hidden bg-forest lg:block">
        <Illustration variant="site-plan" tone="forest" label={false} title="Site plan drawing" />
      </div>
    </div>
  );
}
