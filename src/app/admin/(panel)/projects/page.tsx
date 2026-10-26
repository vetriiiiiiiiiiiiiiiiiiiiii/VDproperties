import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PROJECT_STATUS_LABEL } from "@/lib/labels";

export const metadata = { title: "Projects" };

export default async function AdminProjects({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requirePage("projects:manage");
  const { deleted } = await searchParams;
  const items = await db.project.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { properties: true, images: true } }, location: { select: { name: true } } } });
  return (
    <>
      <PageHeader title="Projects" description="Developments shown on the Ongoing and Completed pages." actions={<Link href="/admin/projects/new" className="btn btn-primary min-h-10 text-sm">Add project</Link>} />
      {deleted && <Notice tone="ok">Project deleted. Its listings and enquiries have been kept.</Notice>}
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Project</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Website</th><th scope="col" className="px-4 py-3">Listings</th><th scope="col" className="px-4 py-3">Updated</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-ivory">
                <td className="px-4 py-3"><Link href={`/admin/projects/${p.id}`} className="font-semibold text-navy hover:text-emerald">{p.name}</Link><span className="block text-xs text-slate">{p.location?.name}{p.isSample ? " · Sample" : ""}</span></td>
                <td className="px-4 py-3">{PROJECT_STATUS_LABEL[p.status]}</td>
                <td className="px-4 py-3">{p.publication === "PUBLISHED" ? "Published" : "Draft"}</td>
                <td className="px-4 py-3">{p._count.properties}</td>
                <td className="px-4 py-3 text-slate">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate">No projects yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
