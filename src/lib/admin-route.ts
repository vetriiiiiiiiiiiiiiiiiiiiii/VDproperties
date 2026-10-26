import "server-only";
import { AuthError, requirePermission } from "./auth";
import type { Permission } from "./rbac";

/** Same-origin check for state-changing admin requests (server actions get this from Next automatically). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return !origin || (!!host && new URL(origin).host === host);
}

export async function guard(req: Request, permission: Permission, { mutating = true } = {}) {
  if (mutating && !sameOrigin(req)) return { error: Response.json({ ok: false, message: "Cross-origin request refused" }, { status: 403 }) };
  try {
    return { user: await requirePermission(permission) };
  } catch (e) {
    if (e instanceof AuthError) return { error: Response.json({ ok: false, message: e.message }, { status: e.status }) };
    throw e;
  }
}
