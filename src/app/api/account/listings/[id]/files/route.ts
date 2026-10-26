import { revalidatePath } from "next/cache";
import { DICTS } from "@/i18n/dict";
import { requestLocale } from "@/i18n/messages";
import { sameOrigin } from "@/lib/admin-route";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_SELLER_DOCUMENTS, MAX_SELLER_PHOTOS, SELLER_EDITABLE } from "@/lib/listings";
import { rateLimit } from "@/lib/rate-limit";
import { assertPdf, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, processImage, savePrivateDocument, savePublicImage, UploadError } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * A seller adds photos or PDFs to their own listing while it's still editable.
 * Photos are re-encoded (metadata such as GPS is stripped); PDFs stay private to staff and the seller.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = requestLocale(req);
  const m = DICTS[locale].market.msg;
  const fail = (message: string, status: number) => Response.json({ ok: false, message }, { status });
  if (!sameOrigin(req)) return fail("Cross-origin request refused", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") return fail(m.notFound, 401);
  if (!rateLimit(`seller-upload:${user.id}`, 40, 10 * 60 * 1000).ok) return fail(m.tooMany, 429);

  const { id } = await params;
  const listing = await db.property.findFirst({
    where: { id, sellerId: user.id, source: "OWNER" },
    select: { id: true, referenceCode: true, title: true, submissionStatus: true, _count: { select: { images: true, documents: true } } },
  });
  if (!listing) return fail(m.notFound, 404);
  if (!listing.submissionStatus || !SELLER_EDITABLE.includes(listing.submissionStatus)) return fail(m.locked, 409);

  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  const kind = fd?.get("kind") === "document" ? "document" : "image";
  if (!(file instanceof File) || file.size === 0) return fail(m.notFound, 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (kind === "image") {
      if (listing._count.images >= MAX_SELLER_PHOTOS) return fail(m.tooManyPhotos(MAX_SELLER_PHOTOS), 422);
      if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Images must be 12 MB or smaller");
      const img = await processImage(buffer);
      const url = await savePublicImage(img.buffer, "properties");
      const saved = await db.propertyImage.create({
        data: { propertyId: id, url, alt: `${listing.title} — photo ${listing._count.images + 1}`, kind: "PHOTO", sortOrder: listing._count.images, width: img.width, height: img.height },
      });
      revalidatePath("/", "layout");
      return Response.json({ ok: true, image: { id: saved.id, url: saved.url } }, { status: 201 });
    }
    if (listing._count.documents >= MAX_SELLER_DOCUMENTS) return fail(m.tooManyDocs(MAX_SELLER_DOCUMENTS), 422);
    const title = String(fd?.get("title") ?? "").trim().slice(0, 80);
    if (title.length < 2) return fail(m.docTitle, 422);
    if (file.size > MAX_DOCUMENT_BYTES) throw new UploadError("Documents must be 10 MB or smaller");
    assertPdf(buffer);
    const key = await savePrivateDocument(buffer);
    const saved = await db.propertyDocument.create({ data: { propertyId: id, title, url: key, isPublic: false } });
    revalidatePath("/", "layout");
    return Response.json({ ok: true, document: { id: saved.id, title: saved.title } }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message, 422);
    console.error("Seller upload failed", err);
    return fail("The upload failed. Please try again.", 500);
  }
}
