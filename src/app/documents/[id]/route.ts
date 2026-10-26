import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { readPrivateDocument } from "@/lib/storage";
import { assertInScope } from "@/lib/zones";

export const dynamic = "force-dynamic";

/**
 * Public documents of published listings are open to all. Private ones are open to staff who manage
 * properties, reviewers of owner submissions (zonal officers only in their zones), and the listing's own seller.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await db.propertyDocument.findUnique({ where: { id }, include: { property: { select: { id: true, publication: true, sellerId: true, source: true } } } });
  if (!doc) return new Response("Not found", { status: 404 });
  const isPublic = doc.isPublic && doc.property.publication === "PUBLISHED";
  if (!isPublic) {
    const user = await getCurrentUser();
    const seller = !!user && user.role === "CUSTOMER" && doc.property.sellerId === user.id;
    let staff = !!user && can(user.role, "properties:manage");
    if (!staff && user && doc.property.source === "OWNER" && can(user.role, "submissions:review")) {
      staff = await assertInScope(user, "property", doc.property.id).then(() => true, () => false);
    }
    if (!seller && !staff) return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readPrivateDocument(doc.url);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.title.replace(/[^\w .-]/g, "_")}.pdf"`,
        "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(isPublic ? {} : { "X-Robots-Tag": "noindex" }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
