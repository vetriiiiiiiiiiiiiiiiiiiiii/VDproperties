import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/PageHeader";
import { requirePage } from "@/lib/auth";
import { BUILD_STATUS_LABEL } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { can } from "@/lib/rbac";

export const metadata = { title: "BuildTrace" };

export default async function BuildTraceList() {
  const user = await requirePage("buildtrace:manage");
  const projects = await db.buildProject.findMany({
    where: user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? {} : { managerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { customer: { select: { name: true } }, manager: { select: { name: true } }, milestones: { select: { status: true } }, changes: { where: { status: "PROPOSED" }, select: { id: true } }, questions: { where: { reply: null }, select: { id: true } } },
  });
  return (
    <>
      <PageHeader
        title="BuildTrace projects"
        description={user.role === "SUPER_ADMIN" || user.role === "ADMIN" ? "All construction projects." : "Projects assigned to you."}
        actions={can(user.role, "buildtrace:create") ? <Link href="/admin/buildtrace/new" className="btn btn-primary min-h-10 text-sm">New project</Link> : undefined}
      />
      <Notice>A project can only be created once a signed agreement or written authorisation with the customer is in place.</Notice>
      <div className="overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wider text-slate">
            <tr><th scope="col" className="px-4 py-3">Project</th><th scope="col" className="px-4 py-3">Customer</th><th scope="col" className="px-4 py-3">Manager</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Milestones</th><th scope="col" className="px-4 py-3">Contract</th><th scope="col" className="px-4 py-3">Needs action</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {projects.map((p) => {
              const done = p.milestones.filter((m) => m.status === "REPORTED_COMPLETE" || m.status === "INSPECTED").length;
              return (
                <tr key={p.id} className="hover:bg-ivory">
                  <td className="px-4 py-3"><Link href={`/admin/buildtrace/${p.id}`} className="font-semibold text-navy hover:text-emerald">{p.code} · {p.title}</Link>{p.isDemo && <span className="ml-2 text-xs text-terracotta-deep">demo</span>}<span className="block text-xs text-slate">Due {formatDate(p.plannedEnd, { dateStyle: "medium", timeZone: "UTC" })}</span></td>
                  <td className="px-4 py-3">{p.customer.name}</td>
                  <td className="px-4 py-3">{p.manager?.name ?? <span className="text-terracotta-deep">Unassigned</span>}</td>
                  <td className="px-4 py-3">{BUILD_STATUS_LABEL[p.status]}</td>
                  <td className="px-4 py-3">{done}/{p.milestones.length}</td>
                  <td className="px-4 py-3">{formatPrice(Number(p.contractValue))}</td>
                  <td className="px-4 py-3 text-xs">{[p.changes.length && `${p.changes.length} change(s)`, p.questions.length && `${p.questions.length} question(s)`].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              );
            })}
            {projects.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate">No projects yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
