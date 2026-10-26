"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formObject, optStr, runAction, type ActionResult } from "@/lib/admin";

const zoneInput = z.object({
  name: z.string().trim().min(2, "Name the zone").max(60),
  description: optStr(300),
  locationIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string().max(40)).max(200)),
});

/** Creates or updates a zone. A location belongs to at most one zone, so ticking it here moves it. */
export async function saveZone(id: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("zones:manage");
    const input = zoneInput.parse(formObject(fd, ["locationIds"]));
    const zone = id
      ? await db.zone.update({ where: { id }, data: { name: input.name, description: input.description ?? null } })
      : await db.zone.create({ data: { name: input.name, description: input.description ?? null } });
    await db.$transaction([
      db.location.updateMany({ where: { zoneId: zone.id, id: { notIn: input.locationIds } }, data: { zoneId: null } }),
      db.location.updateMany({ where: { id: { in: input.locationIds } }, data: { zoneId: zone.id } }),
    ]);
    await audit({ actorId: user.id, action: id ? "zone.updated" : "zone.created", entityType: "Zone", entityId: zone.id, summary: `${zone.name}: ${input.locationIds.length} location(s)` });
    revalidatePath("/admin", "layout");
    return { ok: true, message: id ? "Zone saved." : `${zone.name} created.` };
  });
}

export async function deleteZone(id: string) {
  const user = await requirePermission("zones:manage");
  const zone = await db.zone.delete({ where: { id } });
  await audit({ actorId: user.id, action: "zone.deleted", entityType: "Zone", entityId: id, summary: zone.name });
  revalidatePath("/admin", "layout");
}
