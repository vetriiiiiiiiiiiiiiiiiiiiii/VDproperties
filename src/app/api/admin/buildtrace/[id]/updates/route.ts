import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { AuthError } from "@/lib/auth";
import { loadManagedProject } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { guard } from "@/lib/admin-route";
import { MAX_IMAGE_BYTES, UploadError, processImage, savePrivateBuildFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

const SOURCES = ["CONTRACTOR_REPORTED", "STAFF_OBSERVED", "INDEPENDENT_INSPECTION", "PROFESSIONAL_CERTIFICATE"] as const;

/** Records a progress update with up to 8 photos. Photos are stored privately. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req, "buildtrace:manage");
  if ("error" in g) return g.error;
  const { id } = await params;
  let project;
  try {
    project = await loadManagedProject(g.user, id);
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ ok: false, message: "You don't manage this project" }, { status: 403 });
    throw e;
  }
  const fd = await req.formData().catch(() => null);
  if (!fd) return Response.json({ ok: false, message: "Invalid submission" }, { status: 400 });
  const body = String(fd.get("body") ?? "").trim().slice(0, 4000);
  const source = String(fd.get("source") ?? "");
  const milestoneId = String(fd.get("milestoneId") ?? "") || null;
  const customerVisible = fd.get("customerVisible") === "on";
  if (body.length < 3) return Response.json({ ok: false, message: "Describe the progress" }, { status: 422 });
  if (!SOURCES.includes(source as (typeof SOURCES)[number])) return Response.json({ ok: false, message: "Choose who is reporting this progress" }, { status: 422 });
  if (milestoneId && !(await db.buildMilestone.findFirst({ where: { id: milestoneId, projectId: id } }))) return Response.json({ ok: false, message: "Milestone not found" }, { status: 422 });
  const photos = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > 8) return Response.json({ ok: false, message: "Attach up to 8 photos at a time" }, { status: 422 });
  try {
    const keys: string[] = [];
    for (const f of photos) {
      if (f.size > MAX_IMAGE_BYTES) throw new UploadError("Each photo must be 12 MB or smaller");
      const img = await processImage(Buffer.from(await f.arrayBuffer()));
      keys.push(await savePrivateBuildFile(img.buffer, "webp"));
    }
    const update = await db.buildUpdate.create({
      data: {
        projectId: id,
        milestoneId,
        source: source as (typeof SOURCES)[number],
        body,
        customerVisible,
        authorId: g.user.id,
        files: { create: keys.map((k, i) => ({ projectId: id, kind: "PHOTO", title: `Progress photo ${i + 1}`, storageKey: k, customerVisible })) },
      },
    });
    await audit({ actorId: g.user.id, action: "build.progress_recorded", entityType: "BuildProject", entityId: id, summary: `${project.code}: progress update (${source}) with ${keys.length} photo(s)` });
    revalidatePath(`/admin/buildtrace/${id}`);
    revalidatePath("/account", "layout");
    return Response.json({ ok: true, id: update.id }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ ok: false, message: err.message }, { status: 422 });
    console.error("Progress update failed", err);
    return Response.json({ ok: false, message: "The update could not be saved." }, { status: 500 });
  }
}
