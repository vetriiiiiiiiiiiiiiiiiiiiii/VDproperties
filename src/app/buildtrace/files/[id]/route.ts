import { getCurrentUser } from "@/lib/auth";
import { canManageProject } from "@/lib/buildtrace";
import { db } from "@/lib/db";
import { readPrivateDocument } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves BuildTrace photos and documents. Allowed: staff who manage the project, or the
 * project's own customer when the file is marked customer-visible. Everyone else gets 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  const file = await db.buildFile.findUnique({ where: { id: (await params).id }, include: { project: { select: { customerId: true, managerId: true } } } });
  if (!file) return new Response("Not found", { status: 404 });
  const allowed = canManageProject(user, file.project) || (user.role === "CUSTOMER" && file.project.customerId === user.id && file.customerVisible);
  if (!allowed) return new Response("Not found", { status: 404 });
  try {
    const data = await readPrivateDocument(file.storageKey);
    const pdf = file.storageKey.endsWith(".pdf");
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": pdf ? "application/pdf" : "image/webp",
        "Content-Disposition": `inline; filename="${file.title.replace(/[^\w .-]/g, "_")}.${pdf ? "pdf" : "webp"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
