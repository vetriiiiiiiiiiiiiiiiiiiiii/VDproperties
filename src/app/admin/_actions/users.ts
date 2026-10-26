"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { hashPassword, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordPolicy } from "@/lib/validation";
import { formObject, runAction, type ActionResult } from "@/lib/admin";

const ROLES = ["SUPER_ADMIN", "PROPERTY_MANAGER", "ENQUIRY_MANAGER", "PROJECT_MANAGER"] as const;

export async function createUser(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requirePermission("users:manage");
    const input = z
      .object({
        name: z.string().trim().min(2, "Enter a name").max(80),
        email: z.email("Enter a valid email").max(120).transform((v) => v.toLowerCase()),
        role: z.enum(ROLES),
        password: passwordPolicy,
      })
      .parse(formObject(fd));
    const user = await db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) } });
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
        role: z.enum(ROLES),
        active: z.preprocess((v) => v === "on", z.boolean()),
        password: z.preprocess((v) => (v === "" ? undefined : v), passwordPolicy.optional()),
      })
      .parse(formObject(fd));
    if (id === me.id && (input.role !== "SUPER_ADMIN" || !input.active)) {
      return { ok: false, message: "You can't remove your own Super Admin access or deactivate yourself." };
    }
    const target = await db.user.findUniqueOrThrow({ where: { id } });
    if (target.role === "CUSTOMER") return { ok: false, message: "Customer accounts are managed by the customer." };
    if (target.role === "SUPER_ADMIN" && (input.role !== "SUPER_ADMIN" || !input.active)) {
      const others = await db.user.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: id } } });
      if (others === 0) return { ok: false, message: "There must always be at least one active Super Admin." };
    }
    await db.user.update({
      where: { id },
      data: { role: input.role, active: input.active, ...(input.password && { passwordHash: await hashPassword(input.password), failedLogins: 0, lockedUntil: null }) },
    });
    // Role changes, deactivation or a password reset end that person's existing sessions.
    if (input.role !== target.role || !input.active || input.password) await db.session.deleteMany({ where: { userId: id } });
    await audit({
      actorId: me.id,
      action: "user.updated",
      entityType: "User",
      entityId: id,
      summary: `${target.email}: role ${input.role}, ${input.active ? "active" : "deactivated"}${input.password ? ", password reset" : ""}`,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Team member updated." };
  });
}
