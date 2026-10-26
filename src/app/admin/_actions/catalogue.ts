"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { checkbox, formObject, optStr, runAction, type ActionResult } from "@/lib/admin";

export async function saveLocation(id: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("catalogue:manage");
    const input = z
      .object({ name: z.string().trim().min(2, "Enter a name").max(100), city: optStr(80), district: optStr(80), state: optStr(80), isServiceArea: checkbox })
      .parse(formObject(fd));
    const data = { name: input.name, city: input.city ?? null, district: input.district ?? null, state: input.state ?? null, isServiceArea: input.isServiceArea };
    const loc = id
      ? await db.location.update({ where: { id }, data })
      : await db.location.create({ data: { ...data, slug: slugify([input.name, input.city].filter(Boolean).join(" ")) } });
    await audit({ actorId: user.id, action: id ? "location.updated" : "location.created", entityType: "Location", entityId: loc.id, summary: loc.name });
    revalidatePath("/", "layout");
    return { ok: true, message: id ? "Location updated." : "Location added." };
  });
}

export async function deleteLocation(id: string) {
  const user = await requirePermission("catalogue:manage");
  const used = await db.property.count({ where: { locationId: id } });
  if (used) return;
  const loc = await db.location.delete({ where: { id } });
  await audit({ actorId: user.id, action: "location.deleted", entityType: "Location", entityId: id, summary: loc.name });
  revalidatePath("/", "layout");
}

export async function saveAmenity(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("catalogue:manage");
    const name = z.string().trim().min(2, "Enter a name").max(80).parse(fd.get("name"));
    const a = await db.amenity.create({ data: { name, slug: slugify(name) } });
    await audit({ actorId: user.id, action: "amenity.created", entityType: "Amenity", entityId: a.id, summary: a.name });
    revalidatePath("/", "layout");
    return { ok: true, message: "Amenity added." };
  });
}

export async function deleteAmenity(id: string) {
  const user = await requirePermission("catalogue:manage");
  const a = await db.amenity.delete({ where: { id } });
  await audit({ actorId: user.id, action: "amenity.deleted", entityType: "Amenity", entityId: id, summary: a.name });
  revalidatePath("/", "layout");
}
