"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseFaqs, parseTitledBlocks } from "@/lib/settings-format";
import { TRANSLATABLE, TRANSLATABLE_LISTS, type TranslatableModel } from "@/lib/translations";
import { assertInScope } from "@/lib/zones";
import { runAction, type ActionResult } from "@/lib/admin";

const PERMISSION = { property: "properties:manage", project: "projects:manage", settings: "settings:manage" } as const;

/** Saves the Tamil version of a record's text. Only known fields are kept; blanks fall back to English. */
export async function saveTranslations(model: TranslatableModel, id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission(PERMISSION[model]);
    if (model === "property") await assertInScope(user, "property", id);
    const ta: Record<string, unknown> = {};
    for (const field of TRANSLATABLE[model]) {
      const value = String(fd.get(field) ?? "").trim().slice(0, 20000);
      if (value) ta[field] = value;
    }
    if (model === "settings") {
      for (const field of TRANSLATABLE_LISTS) {
        const text = String(fd.get(field) ?? "").slice(0, 20000);
        const items = field === "faqs" ? parseFaqs(text) : parseTitledBlocks(text);
        if (items.length) ta[field] = items;
      }
    }
    const translations = { ta } as Prisma.InputJsonValue;
    if (model === "property") await db.property.update({ where: { id }, data: { translations } });
    else if (model === "project") await db.project.update({ where: { id }, data: { translations } });
    else await db.siteSettings.update({ where: { id: 1 }, data: { translations } });
    await audit({ actorId: user.id, action: `${model}.translations_updated`, entityType: model, entityId: id, summary: `Tamil text updated (${Object.keys(ta).length} field(s))` });
    revalidatePath("/", "layout");
    return { ok: true, message: "Tamil text saved." };
  });
}
