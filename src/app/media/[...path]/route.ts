import { readFile } from "node:fs/promises";
import { resolveLocalMedia } from "@/lib/storage";

/** Serves locally stored public images (STORAGE_DRIVER=local). Only processed WebP files can be reached. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const file = resolveLocalMedia((await params).path);
  if (!file) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
