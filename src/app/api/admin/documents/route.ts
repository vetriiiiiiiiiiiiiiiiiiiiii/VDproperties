import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { guard } from "@/lib/admin-route";
import { MAX_DOCUMENT_BYTES, UploadError, assertPdf, savePrivateDocument } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req, "properties:manage");
  if ("error" in g) return g.error;
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const propertyId = String(fd?.get("propertyId") ?? "");
  const title = String(fd?.get("title") ?? "").trim().slice(0, 120);
  if (!(file instanceof File) || file.size === 0) return Response.json({ ok: false, message: "Choose a PDF" }, { status: 400 });
  if (file.size > MAX_DOCUMENT_BYTES) return Response.json({ ok: false, message: "Documents must be 10 MB or smaller" }, { status: 413 });
  if (title.length < 2) return Response.json({ ok: false, message: "Give the document a title" }, { status: 422 });
  const property = await db.property.findUnique({ where: { id: propertyId }, select: { id: true, referenceCode: true } });
  if (!property) return Response.json({ ok: false, message: "Property not found" }, { status: 404 });
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    assertPdf(buffer);
    const key = await savePrivateDocument(buffer);
    const doc = await db.propertyDocument.create({ data: { propertyId, title, url: key, isPublic: false } });
    await audit({ actorId: g.user.id, action: "property.document_added", entityType: "Property", entityId: propertyId, summary: `Document “${title}” added to ${property.referenceCode} (private)` });
    revalidatePath("/admin", "layout");
    return Response.json({ ok: true, document: doc }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return Response.json({ ok: false, message: err.message }, { status: 422 });
    console.error("Document upload failed", err);
    return Response.json({ ok: false, message: "The upload failed. Please try again." }, { status: 500 });
  }
}
