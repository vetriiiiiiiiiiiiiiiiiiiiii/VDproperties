import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProject } from "@/app/admin/_actions/projects";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ImageManager } from "@/components/admin/ImageManager";
import { Panel } from "@/components/admin/kit";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Edit project" };

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requirePage("projects:manage");
  const { id } = await params;
  const { created } = await searchParams;
  const [p, locations] = await Promise.all([
    db.project.findUnique({ where: { id }, include: { images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, properties: { select: { id: true, title: true, referenceCode: true } } } }),
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!p) notFound();
  const s = (v: string | null) => v ?? "";
  return (
    <>
      <PageHeader
        title={p.name}
        back={{ href: "/admin/projects", label: "Projects" }}
        actions={p.publication === "PUBLISHED" ? <Link href={`/projects/${p.slug}`} target="_blank" className="btn btn-outline min-h-10 text-sm text-navy">View live</Link> : undefined}
      />
      {created && <Notice tone="ok">Draft created. Add images below, then publish.</Notice>}
      <ProjectForm
        id={p.id}
        locations={locations}
        values={{ name: p.name, slug: p.slug, status: p.status, publication: p.publication, summary: s(p.summary), description: s(p.description), locationId: s(p.locationId), localityLabel: s(p.localityLabel), highlights: s(p.highlights), approvalInfo: s(p.approvalInfo), seoTitle: s(p.seoTitle), seoDescription: s(p.seoDescription), isSample: p.isSample }}
      />
      <div className="mt-6 space-y-6">
        <Panel title="Images">
          <ImageManager target="project" ownerId={p.id} images={p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))} />
        </Panel>
        <Panel title="Listings in this project" description="Link a property to this project from the property's edit page.">
          {p.properties.length ? (
            <ul className="space-y-1 text-sm">
              {p.properties.map((x) => <li key={x.id}><Link href={`/admin/properties/${x.id}`} className="underline">{x.referenceCode} · {x.title}</Link></li>)}
            </ul>
          ) : <p className="text-sm text-slate">None yet.</p>}
          {p.publication === "DRAFT" && (
            <form action={deleteProject.bind(null, p.id)} className="mt-6 border-t border-line pt-4">
              <ConfirmButton message="Delete this draft project? Linked listings and enquiries are kept." className="text-sm text-terracotta-deep underline">Delete draft project</ConfirmButton>
            </form>
          )}
        </Panel>
      </div>
    </>
  );
}
