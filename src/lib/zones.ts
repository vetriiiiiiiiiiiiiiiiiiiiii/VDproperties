import "server-only";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { AuthError, type SessionUser } from "./auth";
import { db } from "./db";

/**
 * Zone scoping for zonal officers. Everyone else sees everything their permissions allow;
 * a zonal officer only sees records whose property (or project) sits in a location of one of
 * their zones. Records with no location at all stay with the office team.
 */
export async function officerZoneIds(user: SessionUser): Promise<string[] | null> {
  if (user.role !== "ZONAL_OFFICER") return null;
  const zones = await db.zone.findMany({ where: { officers: { some: { id: user.id } } }, select: { id: true } });
  return zones.map((z) => z.id);
}

const inZones = (ids: string[]) => ({ zoneId: { in: ids } });

export async function propertyScope(user: SessionUser): Promise<Prisma.PropertyWhereInput> {
  const ids = await officerZoneIds(user);
  return ids ? { location: inZones(ids) } : {};
}

export async function enquiryScope(user: SessionUser): Promise<Prisma.EnquiryWhereInput> {
  const ids = await officerZoneIds(user);
  return ids ? { OR: [{ property: { location: inZones(ids) } }, { project: { location: inZones(ids) } }] } : {};
}

export async function siteVisitScope(user: SessionUser): Promise<Prisma.SiteVisitWhereInput> {
  const ids = await officerZoneIds(user);
  return ids ? { OR: [{ property: { location: inZones(ids) } }, { project: { location: inZones(ids) } }] } : {};
}

export async function purchaseScope(user: SessionUser): Promise<Prisma.PurchaseRequestWhereInput> {
  const ids = await officerZoneIds(user);
  return ids ? { property: { location: inZones(ids) } } : {};
}

/** Throws a 403 unless the record is within the user's reach. Use before reading or changing a single record. */
export async function assertInScope(user: SessionUser, kind: "property" | "enquiry" | "siteVisit" | "purchase", id: string) {
  const ids = await officerZoneIds(user);
  if (!ids) return;
  const where = { id };
  const found =
    kind === "property"
      ? await db.property.count({ where: { ...where, ...(await propertyScope(user)) } })
      : kind === "enquiry"
        ? await db.enquiry.count({ where: { ...where, ...(await enquiryScope(user)) } })
        : kind === "siteVisit"
          ? await db.siteVisit.count({ where: { ...where, ...(await siteVisitScope(user)) } })
          : await db.purchaseRequest.count({ where: { ...where, ...(await purchaseScope(user)) } });
  if (!found) throw new AuthError(403);
}

/** Team members a record may be assigned to: office roles, plus officers covering the record's zone. */
export async function assignableStaff(zoneId?: string | null) {
  return db.user.findMany({
    where: {
      active: true,
      OR: [{ role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] } }, ...(zoneId ? [{ role: "ZONAL_OFFICER" as const, zones: { some: { id: zoneId } } }] : [])],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}

/** Leads can only be assigned to active team members (never to customer accounts). */
export async function isAssignable(id: string | undefined | null) {
  if (!id) return true;
  return !!(await db.user.findFirst({ where: { id, active: true, role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF", "ZONAL_OFFICER"] } } }));
}

/** For admin pages: out-of-zone records send the person back to the overview with a "no access" notice. */
export async function requireInScopePage(user: SessionUser, kind: "property" | "enquiry" | "siteVisit" | "purchase", id: string) {
  try {
    await assertInScope(user, kind, id);
  } catch (e) {
    if (e instanceof AuthError) redirect("/admin?denied=1");
    throw e;
  }
}
