import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** For hosting health checks: confirms the app can reach PostgreSQL. Reveals nothing else. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
