import { PageHeader } from "@/components/admin/PageHeader";
import { EMPTY_PROJECT, ProjectForm } from "@/components/admin/ProjectForm";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Add project" };

export default async function NewProject() {
  await requirePage("projects:manage");
  const locations = await db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Add project" back={{ href: "/admin/projects", label: "Projects" }} />
      <ProjectForm id={null} values={EMPTY_PROJECT} locations={locations} />
    </>
  );
}
