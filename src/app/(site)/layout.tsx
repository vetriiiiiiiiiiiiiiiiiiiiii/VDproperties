import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SampleBanner } from "@/components/site/SampleBanner";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const account = !user
    ? { href: "/account/login", kind: "signin" as const }
    : isStaff(user.role)
      ? { href: "/admin", kind: "admin" as const }
      : { href: "/account", kind: "account" as const };
  return (
    <>
      <div className="sun-progress" aria-hidden="true" />
      <SampleBanner />
      <Header account={account} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
