"use server";

import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { hashPassword, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignableRoles } from "@/lib/rbac";
import { passwordPolicy } from "@/lib/validation";
import { formObject, runAction, type ActionResult } from "@/lib/admin";

const STAFF_ROLE = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "ZONAL_OFFICER"]);
const zoneIds = z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string().max(40)).max(50));

/** Zonal officers must cover at least one zone; other roles don't keep zones. */
async function zonesFor(role: Role, ids: string[]) {
  if (role !== "ZONAL_OFFICER") return { ok: true as const, ids: [] as string[] };
  const valid = await db.zone.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (!valid.length) return { ok: false as const };
  return { ok: true as const, ids: valid.map((z) => z.id) };
}

export async function createUser(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requirePermission("users:manage");
    const input = z
      .object({
        name: z.string().trim().min(2, "Enter a name").max(80),
        email: z.email("Enter a valid email address").max(120).transform((v) => v.toLowerCase()),
        phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(20).optional()),
        role: STAFF_ROLE,
        zoneIds,
        password: passwordPolicy,
      })
      .parse(formObject(fd, ["zoneIds"]));
    if (!assignableRoles(me.role).includes(input.role)) return { ok: false, message: "You can't give that role.", errors: { role: "Not allowed for your role" } };
    const zones = await zonesFor(input.role, input.zoneIds);
    if (!zones.ok) return { ok: false, message: "Choose at least one zone for a zonal officer.", errors: { zoneIds: "Choose a zone" } };
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        role: input.role,
        passwordHash: await hashPassword(input.password),
        zones: { connect: zones.ids.map((id) => ({ id })) },
      },
    });
    await audit({ actorId: me.id, action: "user.created", entityType: "User", entityId: user.id, summary: `${user.email} added as ${user.role}` });
    revalidatePath("/admin/users");
    return { ok: true, message: `${user.name} can now sign in. Share the temporary password with them securely and ask them to change it.` };
  });
}

export async function updateUser(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requirePermission("users:manage");
    const input = z
      .object({
        role: STAFF_ROLE,
        zoneIds,
        active: z.preprocess((v) => v === "on", z.boolean()),
        password: z.preprocess((v) => (v === "" ? undefined : v), passwordPolicy.optional()),
      })
      .parse(formObject(fd, ["zoneIds"]));
    const target = await db.user.findUniqueOrThrow({ where: { id } });
    if (target.role === "CUSTOMER") return { ok: false, message: "Customer accounts are managed by the customer." };
    const allowed = assignableRoles(me.role);
    // Admins can't touch Super Admins or other Admins, or promote anyone to those roles.
    if (id !== me.id && (!allowed.includes(target.role) || !allowed.includes(input.role))) return { ok: false, message: "You can't change this team member." };
    if (id === me.id && (input.role !== me.role || !input.active)) return { ok: false, message: "You can't change your own role or deactivate yourself." };
    if (target.role === "SUPER_ADMIN" && (input.role !== "SUPER_ADMIN" || !input.active)) {
      const others = await db.user.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: id } } });
      if (others === 0) return { ok: false, message: "There must always be at least one active Super Admin." };
    }
    const zones = await zonesFor(input.role, input.zoneIds);
    if (!zones.ok) return { ok: false, message: "Choose at least one zone for a zonal officer.", errors: { zoneIds: "Choose a zone" } };
    await db.user.update({
      where: { id },
      data: {
        role: input.role,
        active: input.active,
        zones: { set: zones.ids.map((z) => ({ id: z })) },
        ...(input.password && { passwordHash: await hashPassword(input.password), failedLogins: 0, lockedUntil: null }),
      },
    });
    // Role changes, deactivation or a password reset end that person's existing sessions.
    if (input.role !== target.role || !input.active || input.password) await db.session.deleteMany({ where: { userId: id } });
    await audit({
      actorId: me.id,
      action: "user.updated",
      entityType: "User",
      entityId: id,
      summary: `${target.email}: role ${input.role}${zones.ids.length ? ` (${zones.ids.length} zone${zones.ids.length > 1 ? "s" : ""})` : ""}, ${input.active ? "active" : "deactivated"}${input.password ? ", password reset" : ""}`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Team member updated." };
  });
}
