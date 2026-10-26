import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { AuthError } from "@/lib/auth";
import { loadManagedProject } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { guard } from "@/lib/admin-route";
import { MAX_DOCUMENT_BYTES, UploadError, assertPdf, savePrivateBuildFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Adds a project document (PDF). Shared with the customer only when marked visible. */
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
  const file = fd?.get("file");
  const title = String(fd?.get("title") ?? "").trim().slice(0, 120);
  if (!(file instanceof File) || file.size === 0) return Response.json({ ok: false, message: "Choose a PDF" }, { status: 400 });
  if (file.size > MAX_DOCUMENT_BYTES) return Response.json({ ok: false, message: "Documents must be 10 MB or smaller" }, { status: 413 });
  if (title.length < 2) return Response.json({ ok: false, message: "Give the document a title" }, { status: 422 });
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    assertPdf(buf);
    const key = await savePrivateBuildFile(buf, "pdf");
    const visible = fd?.get("customerVisible") === "on";
    await db.buildFile.create({ data: { projectId: id, kind: "DOCUMENT", title, storageKey: key, customerVisible: visible } });
    await audit({ actorId: g.user.id, action: "build.document_added", entityType: "BuildProject", entityId: id, summary: `${project.code}: document “${title}” (${visible ? "shared" : "staff only"})` });
    revalidatePath(`/admin/buildtrace/${id}`);
    revalidatePath("/account", "layout");
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ ok: false, message: err.message }, { status: 422 });
    console.error("Build document upload failed", err);
    return Response.json({ ok: false, message: "The upload failed." }, { status: 500 });
  }
}
