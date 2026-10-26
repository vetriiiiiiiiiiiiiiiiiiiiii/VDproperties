import { Panel } from "@/components/admin/kit";
import { PageHeader } from "@/components/admin/PageHeader";
import { CreateUserForm, EditUserForm } from "@/components/admin/UserForms";
import { requirePage } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { assignableRoles } from "@/lib/rbac";

export const metadata = { title: "Team & roles" };

export default async function Users() {
  const me = await requirePage("users:manage");
  const roles = assignableRoles(me.role);
  const [users, zones] = await Promise.all([
    db.user.findMany({ where: { role: { not: "CUSTOMER" } }, orderBy: [{ active: "desc" }, { name: "asc" }], include: { zones: { select: { id: true, name: true } } } }),
    db.zone.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader
        title="Team & roles"
        description="Super Admins manage everything, including the team and settings. Admins approve and publish listings and manage zones, staff and zonal officers. Staff handle listing drafts, leads, appointments and their BuildTrace projects. Zonal Officers work only on properties, owner submissions and leads in their zones."
      />
      <div className="space-y-6">
        <Panel title="Add a team member"><CreateUserForm roles={roles} zones={zones} /></Panel>
        <Panel title={`Team (${users.length})`}>
          <ul className="divide-y divide-line">
            {users.map((u) => {
              const manageable = u.id === me.id || roles.includes(u.role);
              return (
                <li key={u.id} className="py-5">
                  <p className="font-semibold">{u.name} {u.id === me.id && <span className="text-sm font-normal text-slate">(you)</span>} {!u.active && <span className="text-sm font-normal text-terracotta-deep">· deactivated</span>}</p>
                  <p className="text-sm text-slate">
                    {u.email} · {ROLE_LABEL[u.role]}
                    {u.zones.length > 0 && ` · ${u.zones.map((z) => z.name).join(", ")}`} · last sign-in {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "never"}
                    {u.lockedUntil && u.lockedUntil > new Date() ? " · temporarily locked" : ""}
                  </p>
                  {manageable ? (
                    <div className="mt-3"><EditUserForm id={u.id} role={u.role} active={u.active} isSelf={u.id === me.id} roles={roles} zones={zones} zoneIds={u.zones.map((z) => z.id)} /></div>
                  ) : (
                    <p className="mt-2 text-xs text-slate">Only a Super Admin can change this account.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
