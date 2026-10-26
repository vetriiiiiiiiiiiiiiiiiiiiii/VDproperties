import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { readPrivateDocument } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Public documents of published listings are open to all; everything else requires a staff session. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await db.propertyDocument.findUnique({ where: { id }, include: { property: { select: { publication: true } } } });
  if (!doc) return new Response("Not found", { status: 404 });
  const isPublic = doc.isPublic && doc.property.publication === "PUBLISHED";
  if (!isPublic) {
    const user = await getCurrentUser();
    if (!user || !can(user.role, "properties:manage")) return new Response("Not found", { status: 404 });
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
