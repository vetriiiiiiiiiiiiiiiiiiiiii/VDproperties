"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { deleteStored } from "@/lib/storage";
import { checkbox, formObject, nullify, optId, optLongText, optStr, runAction, type ActionResult } from "@/lib/admin";

// Slugs that would collide with the static /projects/* pages.
const RESERVED = new Set(["ongoing", "completed", "upcoming"]);

const projectSchema = z.object({
  name: z.string().trim().min(3, "Enter a project name").max(140),
  slug: z.preprocess((v) => (typeof v === "string" && v.trim() ? slugify(v) : undefined), z.string().min(3).max(80).optional()),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED"]),
  summary: optStr(300),
  description: optLongText(),
  locationId: optId,
  localityLabel: optStr(140),
  highlights: optLongText(4000),
  approvalInfo: optLongText(4000),
  seoTitle: optStr(70),
  seoDescription: optStr(170),
  isSample: checkbox,
  intent: z.enum(["save", "publish", "unpublish"]).default("save"),
});

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = RESERVED.has(base) ? `${base}-project` : base || "project";
  for (let i = 2; await db.project.findFirst({ where: { slug, ...(exceptId && { id: { not: exceptId } }) }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function saveProject(id: string | null, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requirePermission("projects:manage");
    const input = projectSchema.parse(formObject(fd));
    const existing = id ? await db.project.findUnique({ where: { id }, select: { publication: true } }) : null;
    if (id && !existing) return { ok: false, message: "This project no longer exists." };
    const publication = input.intent === "publish" ? "PUBLISHED" : input.intent === "unpublish" ? "DRAFT" : (existing?.publication ?? "DRAFT");
    const { intent: _i, slug, isSample, status, name, ...rest } = input;
    const data = { ...nullify(rest), name, status, isSample, publication } as const;
    const saved = id
      ? await db.project.update({ where: { id }, data: { ...data, ...(slug && { slug: await uniqueSlug(slug, id) }) } })
      : await db.project.create({ data: { ...data, slug: await uniqueSlug(slug ?? slugify(name)) } });
    await audit({ actorId: user.id, action: id ? `project.${input.intent === "save" ? "updated" : input.intent + "ed"}` : "project.created", entityType: "Project", entityId: saved.id, summary: saved.name, metadata: { status, publication } });
    revalidatePath("/", "layout");
    if (!id) redirect(`/admin/projects/${saved.id}?created=1`);
    return { ok: true, message: input.intent === "publish" ? "Published." : input.intent === "unpublish" ? "Unpublished." : "Changes saved." };
  });
}

export async function deleteProject(id: string) {
  const user = await requirePermission("projects:manage");
  const pr = await db.project.findUniqueOrThrow({ where: { id }, include: { images: true } });
  if (pr.publication === "PUBLISHED") throw new Error("Unpublish the project before deleting it.");
  await db.project.delete({ where: { id } });
  await Promise.all(pr.images.map((i) => (i.url.startsWith("placeholder:") ? null : deleteStored(i.url))));
  await audit({ actorId: user.id, action: "project.deleted", entityType: "Project", entityId: id, summary: pr.name });
  revalidatePath("/", "layout");
  redirect("/admin/projects?deleted=1");
}

export async function moveProjectImage(imageId: string, direction: -1 | 1) {
  await requirePermission("projects:manage");
  const img = await db.projectImage.findUniqueOrThrow({ where: { id: imageId } });
  const all = await db.projectImage.findMany({ where: { projectId: img.projectId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const i = all.findIndex((x) => x.id === imageId);
  const j = i + direction;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, n) => db.projectImage.update({ where: { id: x.id }, data: { sortOrder: n } })));
  revalidatePath("/", "layout");
}

export async function removeProjectImage(imageId: string) {
  const user = await requirePermission("projects:manage");
  const img = await db.projectImage.delete({ where: { id: imageId } });
  if (!img.url.startsWith("placeholder:")) await deleteStored(img.url);
  await audit({ actorId: user.id, action: "project.image_removed", entityType: "Project", entityId: img.projectId, summary: "Image removed" });
  revalidatePath("/", "layout");
}

export async function updateProjectImageAlt(imageId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("projects:manage");
    const alt = z.string().trim().min(3, "Describe the image").max(200).parse(fd.get("alt"));
    await db.projectImage.update({ where: { id: imageId }, data: { alt } });
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved" };
  });
}
