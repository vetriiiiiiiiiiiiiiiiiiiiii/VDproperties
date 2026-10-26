import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { CreateUserForm, EditUserForm } from "@/components/admin/UserForms";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata = { title: "Team & roles" };

export default async function Users() {
  const me = await requirePage("users:manage");
  const users = await db.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Team & roles" description="Super Admins manage everything. Property Managers handle listings and projects. Enquiry Managers handle leads and site visits. Project Managers run BuildTrace projects assigned to them." />
      <div className="space-y-6">
        <Panel title="Add a team member"><CreateUserForm /></Panel>
        <Panel title={`Team (${users.length})`}>
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="py-5">
                <p className="font-semibold">{u.name} {u.id === me.id && <span className="text-sm font-normal text-slate">(you)</span>} {!u.active && <span className="text-sm font-normal text-terracotta-deep">· deactivated</span>}</p>
                <p className="text-sm text-slate">{u.email} · {ROLE_LABEL[u.role]} · last sign-in {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "never"}{u.lockedUntil && u.lockedUntil > new Date() ? " · temporarily locked" : ""}</p>
                <div className="mt-3"><EditUserForm id={u.id} role={u.role} active={u.active} isSelf={u.id === me.id} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
