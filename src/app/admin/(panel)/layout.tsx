import Link from "next/link";
import { AdminNav, type NavLink } from "@/components/admin/AdminNav";
import { Logo } from "@/components/site/Logo";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { can, type Permission } from "@/lib/rbac";
import { enquiryScope, propertyScope, purchaseScope, siteVisitScope } from "@/lib/zones";
import { logout } from "../_actions/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  // Badges count only what this person can see (zonal officers: their zones).
  const [newEnquiries, newVisits, newPurchases, openSubmissions] = await Promise.all([
    can(user.role, "leads:manage") ? db.enquiry.count({ where: { status: "NEW", AND: [await enquiryScope(user)] } }) : 0,
    can(user.role, "leads:manage") ? db.siteVisit.count({ where: { status: "NEW", AND: [await siteVisitScope(user)] } }) : 0,
    can(user.role, "purchases:manage") ? db.purchaseRequest.count({ where: { status: "NEW", AND: [await purchaseScope(user)] } }) : 0,
    can(user.role, "submissions:review") ? db.property.count({ where: { source: "OWNER", submissionStatus: { in: ["SUBMITTED", "INSPECTED"] }, AND: [await propertyScope(user)] } }) : 0,
  ]);

  const all: (NavLink & { perm: Permission })[] = [
    { href: "/admin", label: "Overview", perm: "dashboard:view" },
    { href: "/admin/properties", label: "Properties", perm: "properties:manage" },
    { href: "/admin/submissions", label: "Owner submissions", perm: "submissions:review", badge: openSubmissions },
    { href: "/admin/projects", label: "Projects", perm: "projects:manage" },
    { href: "/admin/catalogue", label: "Locations & amenities", perm: "catalogue:manage" },
    { href: "/admin/zones", label: "Zones", perm: "zones:manage" },
    { href: "/admin/developers", label: "Developers", perm: "developers:manage" },
    { href: "/admin/costs", label: "Studio rate cards", perm: "costs:manage" },
    { href: "/admin/enquiries", label: "Enquiries", perm: "leads:manage", badge: newEnquiries },
    { href: "/admin/site-visits", label: "Site visits", perm: "leads:manage", badge: newVisits },
    { href: "/admin/purchases", label: "Purchase requests", perm: "purchases:manage", badge: newPurchases },
    { href: "/admin/appointments", label: "Appointments", perm: "leads:manage" },
    { href: "/admin/customers", label: "Customers", perm: "customers:view" },
    { href: "/admin/buildtrace", label: "BuildTrace", perm: "buildtrace:manage" },
    { href: "/admin/plotfit", label: "PlotFit matching", perm: "plotfit:manage" },
    { href: "/admin/users", label: "Team & roles", perm: "users:manage" },
    { href: "/admin/settings", label: "Company settings", perm: "settings:manage" },
    { href: "/admin/audit", label: "Audit log", perm: "audit:view" },
  ];
  const links = all.filter((l) => can(user.role, l.perm)).map(({ perm: _p, ...l }) => l);

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16rem_1fr]">
      <aside className="survey-grid bg-forest p-4 text-ivory lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:p-5">
        <Link href="/admin" className="mb-6 block"><Logo inverted compact /></Link>
        <AdminNav links={links} />
        <div className="mt-6 border-t border-ivory/15 pt-4 text-sm lg:mt-auto">
          <p className="font-semibold">{user.name}</p>
          <p className="text-ivory/60">{ROLE_LABEL[user.role]}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/admin/account" className="underline">My account</Link>
            <Link href="/" className="underline" target="_blank">View site</Link>
            <form action={logout}>
              <button type="submit" className="underline">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}
