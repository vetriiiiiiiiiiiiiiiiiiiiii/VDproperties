import { CreateProjectForm } from "@/components/admin/BuildForms";
import { PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { DEFAULT_STAGES } from "@/lib/buildtrace";
import { db } from "@/lib/db";

export const metadata = { title: "New BuildTrace project" };

export default async function NewBuild() {
  await requirePage("buildtrace:create");
  const [customers, properties, managers] = await Promise.all([
    db.user.findMany({ where: { role: "CUSTOMER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    db.property.findMany({ orderBy: { referenceCode: "asc" }, select: { id: true, referenceCode: true, title: true } }),
    db.user.findMany({ where: { active: true, role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="New BuildTrace project" back={{ href: "/admin/buildtrace", label: "BuildTrace" }} description="Link the project to the customer's account and the agreement that authorises it." />
      <CreateProjectForm
        customers={customers.map((c) => ({ id: c.id, label: `${c.name} · ${c.email}` }))}
        properties={properties.map((p) => ({ id: p.id, label: `${p.referenceCode} · ${p.title}` }))}
        managers={managers.map((m) => ({ id: m.id, label: m.name }))}
        stages={DEFAULT_STAGES}
      />
    </>
  );
}
